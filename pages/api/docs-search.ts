import MiniSearch from 'minisearch';
import data from '../../data/docs-index.json';

const miniSearch = MiniSearch.loadJSON(JSON.stringify(data.index), {
  fields: ['title', 'content'],
  storeFields: ['title', 'url', 'content'],
});

export const config = { runtime: 'edge' };

export default function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';
  const results = q
    ? miniSearch
        .search(q, { prefix: true })
        .slice(0, 5)
        .map((r) => ({ id: r.id, title: r.title, url: r.url, content: r.content }))
    : [];
  return new Response(JSON.stringify(results), {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, s-maxage=86400' },
  });
}
