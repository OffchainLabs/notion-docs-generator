import { config as loadEnv } from 'dotenv'
import { Client } from '@notionhq/client'
import { lookupQuestions, Question } from '../question'

loadEnv()

const notionToken = process.env.NOTION_TOKEN
const rawQuestionDatabaseId =
  process.env.QUESTION_DATABASE_ID ?? process.env.NOTION_QUESTION_DATABASE_ID

if (!notionToken) {
  console.error(
    'Please set NOTION_TOKEN in environment variables or .env file to access Notion API.'
  )
  process.exit(1)
}

const client = new Client({ auth: notionToken })

async function main(): Promise<void> {
  try {
    const databaseId = normalizeId(rawQuestionDatabaseId)
    console.log(
      `Querying Question database: ${
        databaseId ?? 'using built-in default database ID'
      }`
    )
    // If filter conditions are needed, add them here
    const questions = await lookupQuestions(client, {
        filter: {
            and: [
            // {
            //   property: 'Publishable?',
            //   select: {
            //     equals: 'Publishable',
            //   },
            // },
            {
              property: 'Question',
              rich_text: {
                contains: 'Is there a difference in network fees when executing the same kind of transaction on Orbit L2 and Orbit L3?',
              },
            }
          ]
        },
    }, undefined)
    printAsJSON(questions)
  } catch (error) {
    console.error('Failed to query Question database:', error)
    process.exit(1)
  }
}

function normalizeId(id: string | undefined): string | undefined {
  if (!id) {
    return undefined
  }
  return id.replace(/-/g, '')
}

function printAsJSON(questions: Question[]): void {
  console.log(JSON.stringify(questions, null, 2))
}

void main()

