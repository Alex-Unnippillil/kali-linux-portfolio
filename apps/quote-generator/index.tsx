import type { Metadata } from 'next';

export async function generateMetadata(
  { searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }
): Promise<Metadata> {
  const quote = typeof searchParams.quote === 'string' ? searchParams.quote : '';
  const author = typeof searchParams.author === 'string' ? searchParams.author : '';
  const template = typeof searchParams.template === 'string' ? searchParams.template : 'classic';
  const params = new URLSearchParams();
  if (quote) params.set('quote', quote);
  if (author) params.set('author', author);
  if (template) params.set('template', template);
  const ogUrl = `/apps/quote-generator/og?${params.toString()}`;
  return {
    title: 'Quote Generator',
    description: 'Browse, filter, and share inspirational quotes',
    openGraph: {
      images: [{ url: ogUrl }],
    },
  };
}

export { default, displayQuoteGenerator } from '../../components/apps/quote_generator';
