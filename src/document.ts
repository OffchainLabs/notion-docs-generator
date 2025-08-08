import { Client } from '@notionhq/client'
import { getPageWithBlocks, queryDatabaseWithBlocks, APIRequestOptions, API_REQUEST_DEFAULT_OPTIONS,
} from './notion'
import { parseRecordPage } from './record'
import { renderBlock, renderRichTexts, RenderMode } from './format'

import type { QueryDatabaseParameters, RichTextItemResponse } from '@notionhq/client/build/src/api-endpoints'
import type { Block, Page } from './notion'
import type { Record } from './record'
import type { LinkableTerms } from './format'

const documentDatabaseId = '485a6344453640fca30507f4d4210a47'

export interface Document extends Record {
  slug: RichTextItemResponse[]
}

const isDocument = (item: Document | undefined): item is Document => {
  return Boolean(item)
}

function parseDocumentPage(page: Page): Document | undefined {
  const record = parseRecordPage(page, 'Title')
  const properties = page.page.properties

  const slug = properties['Published slug']
  if (slug.type != 'rich_text') {
    throw new Error('Expected slug to be rich text')
  }

  return {
    ...record,
    slug: slug.rich_text,
  }
}

export async function lookupDocument(client: Client, pageId: string): Promise<Document> {
  const page = await getPageWithBlocks(client, pageId)
  const parsedPage = parseDocumentPage(page)
  if (!parsedPage) {
  	throw new Error("Expected valid page")
  }
  return parsedPage
}

export async function lookupDocuments(
  client: Client,
  query: Omit<QueryDatabaseParameters, 'database_id'>,
  options:APIRequestOptions = API_REQUEST_DEFAULT_OPTIONS,
): Promise<Document[]> {
  const pages = await queryDatabaseWithBlocks(client, {
    database_id: documentDatabaseId,
    ...query,
  }, options)
  return pages.map(parseDocumentPage).filter(isDocument)
}

function renderDocBlocks(
  blocks: Block[],
  linkableTerms: LinkableTerms,
  renderMode: RenderMode
): string {
  let out = ''
  let prevType: string | undefined
  let i = 0
  let listIndex = 1
  
  for (const block of blocks) {
    // Reset list index when transitioning between list types
    if (prevType !== block.block.type && block.block.type === 'numbered_list_item') {
      listIndex = 1
    }
    
    const renderedBlock = renderBlock(
      block,
      linkableTerms,
      renderMode,
      prevType,
      i == blocks.length - 1,
      listIndex
    )
    out += renderedBlock
    
    // Don't add extra newline in Markdown mode as blocks handle their own spacing
    if (renderMode !== RenderMode.Markdown) {
      out += '\n'
    }
    
    // Increment list index for numbered lists
    if (block.block.type === 'numbered_list_item') {
      listIndex++
    }
    
    prevType = block.block.type
    i++
  }
  return out
}

export function renderDocument(doc: Document, linkableTerms: LinkableTerms, renderMode: RenderMode): string {
	let out = ''
  let prevType: string | undefined
  let i = 0
  let inMetadata = false
  for (const block of doc.blocks) {
  	if (i == 0 && block.block.type == 'divider') {
  		out += '---\n'
  		inMetadata = true
  		i++
  		continue
  	}
  	if (inMetadata) {
  		if (block.block.type == 'divider') {
	  		out += '---\n'
	  		inMetadata = false
	  		i++
	  		continue
	  	}
  		if (block.block.type != 'paragraph') {
  			throw new Error(`Can only have paragraph in metadata but found type ${block.block.type}`)
  		}
  		out += renderRichTexts(block.block.paragraph.rich_text, linkableTerms, RenderMode.Plain)
  		out += '\n'
  		i++
  		continue
  	}
    const renderedBlock = renderBlock(
      block,
      linkableTerms,
      renderMode,
      prevType,
      i == doc.blocks.length - 1,
      1  // list index not tracked in document rendering
    )
    out += renderedBlock
    out += '\n'
    prevType = block.block.type
    i++
  }
  return out
}

