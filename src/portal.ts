import { Client } from '@notionhq/client';
import type {
  QueryDatabaseParameters,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints';
import {
  queryDatabaseWithBlocks,
  API_REQUEST_DEFAULT_OPTIONS,
  APIRequestOptions,
  Page,
} from './notion';

const projectDatabaseId = 'be90f84b97d94ea3be668e87ddf80d9f';

// Only use basic properties here
export interface PortalProject {
  pageId: string;
  name: RichTextItemResponse[];
  website: string | null;
  network: string[] | undefined;
  twitter: string | null;
  github: string | null;
  description: RichTextItemResponse[];
}

const isPortalProject = (
  item: PortalProject | undefined
): item is PortalProject => {
  return Boolean(item);
};

export function parsePortalProjectPage(page: Page): PortalProject | undefined {
  const properties = page.page.properties;

  const title = properties[`Title`];
  if (title.type != 'title') {
    throw new Error('Expected title');
  }

  const website = properties['Website Link'];
  if (website.type != 'url') {
    throw new Error('Expected Website Link to be url');
  }

  const chains = properties['Chains'];
  if (chains.type != 'multi_select') {
    throw new Error('Expected Chains to be multi select');
  }

  const twitter = properties['Twitter Link'];
  if (twitter.type != 'url') {
    throw new Error('Expected Twitter Link to be url');
  }

  const github = properties['GitHub Link'];
  if (github.type != 'url') {
    throw new Error('Expected GitHub Link to be url');
  }

  const description = properties['description'];
  if (description.type != 'rich_text') {
    throw new Error('Expected description to be rich_text');
  }
  return {
    pageId: page.page.id,
    name: title.title,
    website: website.url,
    network: chains.multi_select.map((c) => c.name),
    twitter: twitter.url,
    github: github.url,
    description: description.rich_text,
  };
}

export async function lookupPortalProjets(
  client: Client,
  query: Omit<QueryDatabaseParameters, 'database_id'>,
  options: APIRequestOptions = API_REQUEST_DEFAULT_OPTIONS
): Promise<PortalProject[]> {
  const pages = await queryDatabaseWithBlocks(
    client,
    {
      database_id: projectDatabaseId,
      ...query,
    },
    options
  );

  return pages.map(parsePortalProjectPage).filter(isPortalProject);
}
