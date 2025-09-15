import { useEffect, useState } from 'react';
import Filter from 'bad-words';
import offlineQuotesData from '../public/quotes/quotes.json';
import useJson from './useJson';

const SAFE_CATEGORIES = [
  'inspirational',
  'life',
  'love',
  'wisdom',
  'technology',
  'humor',
  'general',
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  inspirational: [
    'inspire',
    'dream',
    'goal',
    'courage',
    'success',
    'motivation',
    'believe',
    'achieve',
  ],
  life: ['life', 'living', 'journey', 'experience'],
  love: ['love', 'heart', 'passion'],
  wisdom: ['wisdom', 'knowledge', 'learn', 'education'],
  technology: ['technology', 'science', 'computer'],
  humor: ['laugh', 'funny', 'humor'],
};

const filter = new Filter();

const processQuotes = (data: any[]) =>
  data
    .map((q) => {
      const content = q.content || q.quote || '';
      const author = q.author || 'Unknown';
      let tags = Array.isArray(q.tags) ? q.tags.map((t: string) => t.toLowerCase()) : [];

      if (!tags.length) {
        const lower = content.toLowerCase();
        Object.entries(CATEGORY_KEYWORDS).forEach(([cat, keywords]) => {
          if (keywords.some((k) => lower.includes(k))) tags.push(cat);
        });
      }
      if (!tags.length) tags.push('general');
      return { content, author, tags };
    })
    .filter(
      (q) =>
        !filter.isProfane(q.content) &&
        q.tags.some((t: string) => SAFE_CATEGORIES.includes(t))
    );

const offlineQuotes = processQuotes(offlineQuotesData as any[]);

interface Quote {
  content: string;
  author: string;
  date: string;
  tags?: string[];
}

export default function useDailyQuote(tag?: string) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const url =
    typeof window === 'undefined' ||
    process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true'
      ? null
      : `/api/quote${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`;

  const { data } = useJson<Quote>(url);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const stored = localStorage.getItem('dailyQuote');
      if (stored) {
        const parsed: Quote = JSON.parse(stored);
        if (parsed.date === today && (!tag || parsed.tags?.includes(tag))) {
          setQuote(parsed);
          return;
        }
      }
    } catch {
      // ignore storage errors
    }

    if (data) {
      const toStore: Quote = { ...data, date: today } as Quote;
      try {
        localStorage.setItem('dailyQuote', JSON.stringify(toStore));
      } catch {
        // ignore storage errors
      }
      setQuote(toStore);
      return;
    }

    const pool = tag
      ? offlineQuotes.filter((q) => q.tags.includes(tag))
      : offlineQuotes;
    const fetched = pool[Math.floor(Math.random() * pool.length)];
    const toStore: Quote = { ...fetched, date: today } as Quote;
    try {
      localStorage.setItem('dailyQuote', JSON.stringify(toStore));
    } catch {
      // ignore storage errors
    }
    setQuote(toStore);
  }, [data, tag]);

  return quote;
}

