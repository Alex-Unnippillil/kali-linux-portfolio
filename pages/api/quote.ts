import quotesData from '../../public/quotes/quotes.json';

interface Quote {
  content: string;
  author: string;
  tags?: string[];
}

const quotes = quotesData as Quote[];

export const runtime = 'edge';

export default function handler(req: Request): Response {
  const url = new URL(req.url);
  const tag = url.searchParams.get('tag');
  const pool = tag ? quotes.filter((q) => q.tags?.includes(tag)) : quotes;
  const quote = pool[Math.floor(Math.random() * pool.length)];

  return new Response(JSON.stringify(quote), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
    },
  });
}

