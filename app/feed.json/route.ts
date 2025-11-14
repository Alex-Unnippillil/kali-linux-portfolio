import { FEED_DESCRIPTION, FEED_TITLE, SITE_URL, getFeedItems } from '@/lib/feed';

export async function GET() {
  const items = getFeedItems().map((item) => ({
    id: item.id,
    url: item.url,
    title: item.title,
    content_text: item.summary,
    date_published: item.date.toISOString(),
    ...(item.tags.length ? { tags: item.tags } : {}),
  }));

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: FEED_TITLE,
    description: FEED_DESCRIPTION,
    home_page_url: SITE_URL,
    feed_url: `${SITE_URL}/feed.json`,
    language: 'en-CA',
    items,
  };

  return Response.json(feed, {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=1800',
    },
  });
}
