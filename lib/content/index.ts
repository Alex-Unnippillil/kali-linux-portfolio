import defaultLocalContent from '../../data/content.local.json';
import { createLocalContentProvider } from './local';
import { createNotionContentProvider } from './notion';
import type { ContentProvider, ContentProviderName, ContentItem } from './provider';
import { CONTENT_PROVIDER_ENV, PUBLIC_CONTENT_PROVIDER_ENV } from './provider';

export function resolveContentProviderName(): ContentProviderName {
  const rawName =
    process.env[CONTENT_PROVIDER_ENV] ??
    process.env[PUBLIC_CONTENT_PROVIDER_ENV] ??
    'local';

  if (typeof rawName === 'string' && rawName.toLowerCase() === 'notion') {
    return 'notion';
  }

  return 'local';
}

let cachedProvider: ContentProvider | null = null;
let cachedName: ContentProviderName | null = null;

export function getContentProvider(): ContentProvider {
  const name = resolveContentProviderName();
  if (cachedProvider && cachedName === name) {
    return cachedProvider;
  }

  cachedProvider = createProvider(name);
  cachedName = name;
  return cachedProvider;
}

function createProvider(name: ContentProviderName): ContentProvider {
  if (name === 'notion') {
    const databaseId = process.env.NOTION_DATABASE_ID;
    const authToken = process.env.NOTION_API_KEY ?? process.env.NOTION_TOKEN;

    if (!databaseId || !authToken) {
      throw new Error(
        'CONTENT_PROVIDER=notion requires NOTION_DATABASE_ID and NOTION_API_KEY (or NOTION_TOKEN) to be set.',
      );
    }

    return createNotionContentProvider({
      databaseId,
      authToken,
      apiBaseUrl: process.env.NOTION_API_BASE_URL,
      slugProperty: process.env.NOTION_SLUG_PROPERTY,
      titleProperty: process.env.NOTION_TITLE_PROPERTY,
      excerptProperty: process.env.NOTION_EXCERPT_PROPERTY,
      bodyProperty: process.env.NOTION_BODY_PROPERTY,
      tagsProperty: process.env.NOTION_TAGS_PROPERTY,
    });
  }

  const localPath = process.env.CONTENT_LOCAL_PATH;
  if (localPath && isNodeEnvironment()) {
    return createLocalContentProvider({ filePath: localPath });
  }

  return createLocalContentProvider({ items: defaultLocalContent as ContentItem[] });
}

function isNodeEnvironment(): boolean {
  return typeof process !== 'undefined' && Boolean(process?.versions?.node);
}
