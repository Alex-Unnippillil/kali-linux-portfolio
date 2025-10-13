import { NotionContentProvider } from '../../../lib/content/notion';

const globalAny = global as typeof globalThis & { fetch: jest.Mock };

describe('NotionContentProvider', () => {
  const config = {
    databaseId: 'db123',
    authToken: 'token456',
  };

  beforeEach(() => {
    globalAny.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('queries the Notion API and maps results', async () => {
    const provider = new NotionContentProvider(config);
    const notionResponse = {
      results: [
        {
          id: 'page-1',
          last_edited_time: '2024-02-01T10:00:00.000Z',
          url: 'https://notion.so/page-1',
          properties: {
            Slug: { type: 'rich_text', rich_text: [{ plain_text: 'page-slug' }] },
            Name: { type: 'title', title: [{ plain_text: 'Page Title' }] },
            Excerpt: { type: 'rich_text', rich_text: [{ plain_text: 'Summary' }] },
            Body: { type: 'rich_text', rich_text: [{ plain_text: 'Body copy' }] },
            Tags: {
              type: 'multi_select',
              multi_select: [{ name: 'ops' }, { name: 'featured' }],
            },
          },
        },
      ],
    };

    globalAny.fetch.mockResolvedValue({
      ok: true,
      json: async () => notionResponse,
    });

    const items = await provider.listContent({ tag: 'ops', limit: 5 });

    expect(globalAny.fetch).toHaveBeenCalledTimes(1);
    const [url, request] = globalAny.fetch.mock.calls[0];
    expect(url).toBe('https://api.notion.com/v1/databases/db123/query');
    expect(request.method).toBe('POST');
    expect(JSON.parse(request.body)).toEqual({
      page_size: 5,
      filter: {
        property: 'Tags',
        multi_select: { contains: 'ops' },
      },
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'page-1',
      slug: 'page-slug',
      title: 'Page Title',
      excerpt: 'Summary',
      body: 'Body copy',
      tags: ['ops', 'featured'],
      updatedAt: '2024-02-01T10:00:00.000Z',
      metadata: { url: 'https://notion.so/page-1' },
    });
  });

  it('fetches a single page by slug', async () => {
    const provider = new NotionContentProvider(config);
    const notionResponse = {
      results: [
        {
          id: 'page-2',
          properties: {
            Slug: { type: 'rich_text', rich_text: [{ plain_text: 'detail' }] },
            Name: { type: 'title', title: [{ plain_text: 'Detail Page' }] },
            Body: { type: 'rich_text', rich_text: [{ plain_text: 'Details' }] },
            Tags: { type: 'multi_select', multi_select: [] },
          },
        },
      ],
    };

    globalAny.fetch.mockResolvedValue({
      ok: true,
      json: async () => notionResponse,
    });

    const item = await provider.getContent('detail');

    expect(globalAny.fetch).toHaveBeenCalledTimes(1);
    const [, request] = globalAny.fetch.mock.calls[0];
    expect(JSON.parse(request.body)).toEqual({
      page_size: 1,
      filter: {
        property: 'Slug',
        rich_text: { equals: 'detail' },
      },
    });

    expect(item?.slug).toBe('detail');
    expect(item?.title).toBe('Detail Page');
  });

  it('returns null when the slug is not found', async () => {
    const provider = new NotionContentProvider(config);

    globalAny.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });

    const item = await provider.getContent('missing');
    expect(item).toBeNull();
  });

  it('throws when the Notion API returns an error', async () => {
    const provider = new NotionContentProvider(config);

    globalAny.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => 'invalid payload',
    });

    await expect(provider.listContent()).rejects.toThrow('Notion API request failed: 400 invalid payload');
  });
});
