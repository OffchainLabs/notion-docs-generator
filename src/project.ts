import { Client } from '@notionhq/client'
import { queryDatabase, API_REQUEST_DEFAULT_OPTIONS, APIRequestOptions } from './notion'

const projectDatabaseId = 'f96a33aa166046d1b323a553344e5ac4'

export async function lookupProject(
  client: Client,
  name: string,
  options: APIRequestOptions = API_REQUEST_DEFAULT_OPTIONS
): Promise<string> {
  const pages = await queryDatabase(client, {
    database_id: projectDatabaseId,
    filter: {
      property: 'Project name',
      rich_text: {
        equals: name,
      },
    },
  }, options)

  for (const page of pages) {
    return page.id
  }
  throw new Error('Project not found')
}
