import { Client } from '@notionhq/client'
import {
  queryDatabaseWithBlocks,
  APIRequestOptions,
  API_REQUEST_DEFAULT_OPTIONS,
  Page,
  queryDatabase,
} from './notion'
import { RichTextItemResponse } from '@notionhq/client/build/src/api-endpoints'
import type { QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints'

const questionDatabaseId = '2a701a3f59f880db8ebdc93e0dba5ce8'
const questionTypeDatabaseId = '2a701a3f59f880278472c9c288d64833'

export interface Question {
  id: string
  question: RichTextItemResponse[]
  answer: RichTextItemResponse[]
  questionType: string[]
  publishable: string | undefined
}

export interface QuestionType {
  id: string
  category: string
}

const isQuestion = (item: Question | undefined): item is Question => {
  return Boolean(item)
}

function parseQuestionPage(
  page: Page,
  questionTypesMap: Map<string, string>
): Question | undefined {
  const properties = page.page.properties

  const question = properties['Question']
  if (question?.type != 'title') {
    throw new Error('Expected Question to be title')
  }

  const answer = properties['Answer']
  if (answer?.type != 'rich_text') {
    throw new Error('Expected Answer to be rich_text')
  }

  const questionTypeProp = properties['Question type']
  if (questionTypeProp?.type != 'relation') {
    throw new Error('Expected Question type to be relation')
  }

  const publishable = properties['Publishable?']
  if (publishable?.type != 'select') {
    throw new Error('Expected Publishable? to be select')
  }

  const questionTypeIds = questionTypeProp.relation.map((r) => r.id)
  const questionTypeNames = questionTypeIds
    .map((id) => questionTypesMap.get(id))
    .filter((name): name is string => !!name)

  return {
    id: page.page.id,
    question: question.title,
    answer: answer.rich_text,
    questionType: questionTypeNames,
    publishable: publishable.select?.name,
  }
}

function parseQuestionTypePage(
  page: any
): QuestionType | undefined {
  const properties = page.properties
  const category = properties['Category']
  if (category?.type != 'title') {
    console.warn('Skipping Question Type without Category title')
    return undefined
  }
  
  // Get plain text title
  const categoryName = category.title.map((t: any) => t.plain_text).join('')

  return {
    id: page.id,
    category: categoryName,
  }
}

async function getQuestionTypesMap(
  client: Client,
  options: APIRequestOptions
): Promise<Map<string, string>> {
  // Query the entire Question Type database
  const pages = await queryDatabase(
    client,
    {
      database_id: questionTypeDatabaseId,
    },
    options
  )

  const map = new Map<string, string>()
  for (const page of pages) {
    const qt = parseQuestionTypePage(page)
    if (qt) {
      map.set(qt.id, qt.category)
    }
  }
  return map
}

export async function lookupQuestions(
  client: Client,
  query: Omit<QueryDatabaseParameters, 'database_id'>,
  options: APIRequestOptions = API_REQUEST_DEFAULT_OPTIONS,
): Promise<Question[]> {
  // Fetch Questions and Question Types in parallel
  const [pages, questionTypesMap] = await Promise.all([
    queryDatabaseWithBlocks(
      client,
      {
        database_id: questionDatabaseId,
        ...query,
      },
      options
    ),
    getQuestionTypesMap(client, options),
  ])

  return pages
    .map(page => parseQuestionPage(page, questionTypesMap))
    .filter(isQuestion)
}
