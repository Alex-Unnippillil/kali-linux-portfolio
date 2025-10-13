import type { ContentItem, ContentProvider, ListContentOptions } from './provider';

export interface NotionContentProviderConfig {
  databaseId: string;
  authToken: string;
  /** Optional override for the Notion API URL. Useful for testing. */
  apiBaseUrl?: string;
  slugProperty?: string;
  titleProperty?: string;
  excerptProperty?: string;
  bodyProperty?: string;
  tagsProperty?: string;
}

interface NotionQueryBody {
  page_size?: number;
  filter?: Record<string, unknown>;
}

interface NotionQueryResult {
  results: NotionPage[];
}

interface NotionPage {
  id: string;
  last_edited_time?: string;
  url?: string;
  properties: Record<string, NotionProperty>;
}

interface NotionProperty {
  type: string;
  title?: NotionRichText[];
  rich_text?: NotionRichText[];
  multi_select?: { name: string }[];
}

interface NotionRichText {
  plain_text?: string;
}

const DEFAULT_NOTION_VERSION = '2022-06-28';
const DEFAULT_API_BASE_URL = 'https://api.notion.com/v1';
const DEFAULT_SLUG_PROPERTY = 'Slug';
const DEFAULT_TITLE_PROPERTY = 'Name';
const DEFAULT_EXCERPT_PROPERTY = 'Excerpt';
const DEFAULT_BODY_PROPERTY = 'Body';
const DEFAULT_TAGS_PROPERTY = 'Tags';

export class NotionContentProvider implements ContentProvider {
  private readonly slugProperty: string;
  private readonly titleProperty: string;
  private readonly excerptProperty: string;
  private readonly bodyProperty: string;
  private readonly tagsProperty: string;
  private readonly apiBaseUrl: string;

  constructor(private readonly config: NotionContentProviderConfig) {
    if (!config.databaseId) {
      throw new Error('NotionContentProvider requires a databaseId');
    }

    if (!config.authToken) {
      throw new Error('NotionContentProvider requires an authToken');
    }

    this.apiBaseUrl = config.apiBaseUrl ?? DEFAULT_API_BASE_URL;
    this.slugProperty = config.slugProperty ?? DEFAULT_SLUG_PROPERTY;
    this.titleProperty = config.titleProperty ?? DEFAULT_TITLE_PROPERTY;
    this.excerptProperty = config.excerptProperty ?? DEFAULT_EXCERPT_PROPERTY;
    this.bodyProperty = config.bodyProperty ?? DEFAULT_BODY_PROPERTY;
    this.tagsProperty = config.tagsProperty ?? DEFAULT_TAGS_PROPERTY;
  }

  async listContent(options: ListContentOptions = {}): Promise<ContentItem[]> {
    const body: NotionQueryBody = {};

    if (typeof options.limit === 'number') {
      body.page_size = Math.max(1, Math.min(100, options.limit));
    }

    if (options.tag) {
      body.filter = {
        property: this.tagsProperty,
        multi_select: {
          contains: options.tag,
        },
      };
    }

    const data = await this.queryDatabase(body);
    return data.results.map((page) => this.mapPageToContent(page));
  }

  async getContent(slug: string): Promise<ContentItem | null> {
    const body: NotionQueryBody = {
      page_size: 1,
      filter: {
        property: this.slugProperty,
        rich_text: {
          equals: slug,
        },
      },
    };

    const data = await this.queryDatabase(body);
    const page = data.results[0];
    return page ? this.mapPageToContent(page) : null;
  }

  private async queryDatabase(body: NotionQueryBody): Promise<NotionQueryResult> {
    const response = await fetch(`${this.apiBaseUrl}/databases/${this.config.databaseId}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.authToken}`,
        'Notion-Version': DEFAULT_NOTION_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const message = await safeReadError(response);
      throw new Error(`Notion API request failed: ${response.status} ${message}`);
    }

    return (await response.json()) as NotionQueryResult;
  }

  private mapPageToContent(page: NotionPage): ContentItem {
    const slug = extractPlainText(page.properties[this.slugProperty]);
    const title = extractPlainText(page.properties[this.titleProperty]);
    const excerpt = extractPlainText(page.properties[this.excerptProperty]);
    const body = extractPlainText(page.properties[this.bodyProperty]);
    const tags = extractTags(page.properties[this.tagsProperty]);

    if (!slug) {
      throw new Error(`Notion page ${page.id} is missing the slug property "${this.slugProperty}"`);
    }

    return {
      id: page.id,
      slug,
      title: title ?? slug,
      excerpt: excerpt ?? null,
      body: body ?? null,
      tags,
      updatedAt: page.last_edited_time ?? null,
      metadata: {
        url: page.url,
      },
    };
  }
}

export function createNotionContentProvider(config: NotionContentProviderConfig): NotionContentProvider {
  return new NotionContentProvider(config);
}

async function safeReadError(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text || response.statusText;
  } catch (error) {
    return response.statusText;
  }
}

function extractPlainText(property?: NotionProperty): string | null {
  if (!property) {
    return null;
  }

  if (property.type === 'title' && Array.isArray(property.title)) {
    return property.title.map((item) => item.plain_text ?? '').join('').trim() || null;
  }

  if (property.type === 'rich_text' && Array.isArray(property.rich_text)) {
    return property.rich_text.map((item) => item.plain_text ?? '').join('').trim() || null;
  }

  return null;
}

function extractTags(property?: NotionProperty): string[] {
  if (!property || property.type !== 'multi_select' || !Array.isArray(property.multi_select)) {
    return [];
  }

  return property.multi_select
    .map((item) => item.name)
    .filter((name): name is string => Boolean(name));
}
