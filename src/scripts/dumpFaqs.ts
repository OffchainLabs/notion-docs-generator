import { config as loadEnv } from 'dotenv'
import { Client } from '@notionhq/client'
import { lookupFAQs, FAQ } from '../faq'

loadEnv()

const notionToken = process.env.NOTION_TOKEN
const rawFaqDatabaseId =
  process.env.FAQ_DATABASE_ID ?? process.env.NOTION_FAQ_DATABASE_ID

if (!notionToken) {
  console.error(
    'Please set NOTION_TOKEN in environment variables or .env file to access Notion API.'
  )
  process.exit(1)
}

const client = new Client({ auth: notionToken })

async function main(): Promise<void> {
  try {
    const databaseId = normalizeId(rawFaqDatabaseId)
    console.log(
      `Querying FAQ database: ${
        databaseId ?? 'using built-in default database ID'
      }`
    )
    const faqs = await lookupFAQs(client, {
      filter: {
        and: [
          {
            property: 'Publishable?',
            select: {
              equals: 'Publishable',
            },
          },
          {
            property: 'Question',
            rich_text: {
              contains: 'Can I delegate my voting power to more than one delegate?',
            },
          }
        ],
      },
    }, undefined)
    printAsJSON(faqs)
  } catch (error) {
    console.error('Failed to query FAQ database:', error)
    process.exit(1)
  }
}

function normalizeId(id: string | undefined): string | undefined {
  if (!id) {
    return undefined
  }
  return id.replace(/-/g, '')
}

function printAsJSON(faqs: FAQ[]): void {
  console.log(JSON.stringify(faqs, null, 2))
}

void main()
