import { FEED_DESCRIPTION, FEED_TITLE, SITE_URL, getFeedItems } from '@/lib/feed';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const items = getFeedItems();
  const lastBuildDate = items[0]?.date ?? new Date();

  const feedItems = items
    .map((item) => {
      const categories = item.tags
        .map((tag) => `      <category>${escapeXml(tag)}</category>`)
        .join('\n');
      const categoriesBlock = categories ? `\n${categories}` : '';

      return `    <item>\n      <title>${escapeXml(item.title)}</title>\n      <link>${escapeXml(item.url)}</link>\n      <guid>${escapeXml(item.id)}</guid>\n      <description>${escapeXml(item.summary)}</description>\n      <pubDate>${item.date.toUTCString()}</pubDate>${categoriesBlock}\n    </item>`;
    })
    .join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>${escapeXml(FEED_TITLE)}</title>\n    <link>${escapeXml(SITE_URL)}</link>\n    <description>${escapeXml(FEED_DESCRIPTION)}</description>\n    <language>en-CA</language>\n    <lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>\n${feedItems}\n  </channel>\n</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=1800',
    },
  });
}
