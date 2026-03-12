import { useEffect, useState } from 'react';
import { filterByTag, getAllQuotes, type Quote as BaseQuote } from '../quotes/localQuotes';

const offlineQuotes = getAllQuotes();

interface Quote extends BaseQuote {
  date: string;
}

export default function useDailyQuote(tag?: string) {
  const [quote, setQuote] = useState<Quote | null>(null);

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

    const pool = filterByTag(offlineQuotes, tag);

    const fallbackPool = pool.length > 0 ? pool : offlineQuotes;
    const fetched =
      fallbackPool.length > 0
        ? fallbackPool[Math.floor(Math.random() * fallbackPool.length)]
        : undefined;

    if (!fetched) {
      setQuote(null);
      return;
    }

    const toStore: Quote = { ...fetched, date: today } as Quote;
    try {
      localStorage.setItem('dailyQuote', JSON.stringify(toStore));
    } catch {
      // ignore storage errors
    }
    setQuote(toStore);
  }, [tag]);

  return quote;
}

