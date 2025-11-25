import {
  Client,
  isFullPage,
  isFullBlock,
  collectPaginatedAPI,
} from '@notionhq/client'
import {
  PageObjectResponse,
  BlockObjectResponse,
  QueryDatabaseParameters,
  PartialPageObjectResponse,
  ListBlockChildrenResponse,
  GetPageResponse
} from '@notionhq/client/build/src/api-endpoints'

export interface Page {
  page: PageObjectResponse
  blocks: Block[]
}

export interface Block {
  block: BlockObjectResponse
  children: Block[]
}

export type IconItemResponse =
  | {
      type: 'emoji';
      emoji: string; // EmojiRequest
    }
  | {
      type: 'external';
      external: {
        url: string; // TextRequest
      };
    }
  | {
      type: 'file';
      file: {
        url: string;
        expiry_time: string;
      };
    }
  | null;

export const API_REQUEST_DEFAULT_OPTIONS = {
  attempts: 3,
  delaySeconds: 5
}
export interface APIRequestOptions {
    attempts: number,
    delaySeconds: number
}

const wait = (delay: number) =>
  new Promise(resolve => setTimeout(resolve, delay))

export async function queryDatabase(
  client: Client,
  params: QueryDatabaseParameters,
  options:APIRequestOptions = API_REQUEST_DEFAULT_OPTIONS,
): Promise<PageObjectResponse[]> {
  let pages: (PageObjectResponse | PartialPageObjectResponse)[]
  try {
    const results = await collectPaginatedAPI(client.databases.query, params)
    // Filter to only include page objects, excluding database objects
    pages = results.filter((item): item is PageObjectResponse | PartialPageObjectResponse =>
      item.object === 'page'
    )
  } catch(err:any){
    if (err.status == 502 || err.status == 500){
      const attemptsLeft = options.attempts - 1;
      if (attemptsLeft > 0){
        console.log(`DQ query ${err.status} error: ${attemptsLeft} attempts remaining.`);
        console.log(` Waiting ${options.delaySeconds} seconds and trying again`);
        await wait(options.delaySeconds * 1000);
        return queryDatabase(client, params, {...options, attempts: attemptsLeft})
      }
    }
    throw err
  }
  const fullPages: PageObjectResponse[] = []
  for (const page of pages) {
    if (!isFullPage(page)) {
      throw new Error('Found non-full page')
    }
    fullPages.push(page)
  }
  return fullPages
}

export async function queryDatabaseWithBlocks(
  client: Client,
  params: QueryDatabaseParameters,
  options:APIRequestOptions = API_REQUEST_DEFAULT_OPTIONS,
): Promise<Page[]> {
  const fullPages = await queryDatabase(client, params, options)
  const children = await Promise.all(
    fullPages.map(page => {
      return getBlockChildren(client, page.id, options)
    })
  )
  return fullPages.map((page, i) => {
    return {
      page: page,
      blocks: children[i],
    }
  })
}

export async function getPageWithBlocks(
  client: Client,
  pageId: string,
  options: APIRequestOptions = API_REQUEST_DEFAULT_OPTIONS,
): Promise<Page> {
  let page: GetPageResponse;
  try {
    page = await client.pages.retrieve({page_id: pageId})
  } catch(err:any){
    if (err.status == 502 || err.status == 500){
      const attemptsLeft = options.attempts - 1;
      if (attemptsLeft > 0){
        console.log(`Get pages ${err.status} error: ${attemptsLeft} attempts remaining.`);
        console.log(` Waiting ${options.delaySeconds} seconds and trying again`);
        await wait(options.delaySeconds * 1000);
        return getPageWithBlocks(client, pageId, {...options, attempts: attemptsLeft})
      }
    }
    throw err

  }
  if (!isFullPage(page)) {
      throw new Error('Found non-full page')
    }
  return {
    page: page,
    blocks: await getBlockChildren(client, page.id, options),
  }
}

async function getBlockChildren(
  client: Client,
  block_id: string,
  options: APIRequestOptions = API_REQUEST_DEFAULT_OPTIONS,
): Promise<Block[]> {
  let blocks: ListBlockChildrenResponse;
  try {
    blocks = await client.blocks.children.list({ block_id })
  } catch(err:any){
    if (err.status == 502 || err.status == 500){
      const attemptsLeft = options.attempts - 1;
      if (attemptsLeft > 0){
        console.log(`Get Block Children ${err.status} error: ${attemptsLeft} attempts remaining.`);
        console.log(` Waiting ${options.delaySeconds} seconds and trying again`);
        await wait(options.delaySeconds * 1000);
        return getBlockChildren(client, block_id, {...options, attempts: attemptsLeft})
      }
    }
    throw err
  }
  const fullBlocks: Block[] = []
  for (const block of blocks.results) {
    if (!isFullBlock(block)) {
      console.log('non full', block)
      throw new Error('Found non-full block')
    }
    let children: Block[] = []
    if (block.has_children) {
      children = await getBlockChildren(client, block.id, options)
    }
    fullBlocks.push({ block, children })
  }
  return fullBlocks
}
