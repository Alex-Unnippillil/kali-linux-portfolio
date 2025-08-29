'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import Filter from 'bad-words';
import { toPng } from 'html-to-image';
import offlineQuotes from '../../components/apps/quotes.json';
import share, { canShare } from '../../utils/share';
import Posterizer from './components/Posterizer';

interface Quote {
  content: string;
  author: string;
  tags: string[];
}

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
  inspirational: ['inspire', 'dream', 'goal', 'courage', 'success', 'motivation', 'believe', 'achieve'],
  life: ['life', 'living', 'journey', 'experience'],
  love: ['love', 'heart', 'passion'],
  wisdom: ['wisdom', 'knowledge', 'learn', 'education'],
  technology: ['technology', 'science', 'computer'],
  humor: ['laugh', 'funny', 'humor'],
};

const processQuotes = (data: any[]): Quote[] => {
  const filter = new Filter();
  return data
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
      return { content, author, tags } as Quote;
    })
    .filter(
      (q) => !filter.isProfane(q.content) && q.tags.some((t) => SAFE_CATEGORIES.includes(t))
    );
};

const keyOf = (q: Quote) => `${q.content}—${q.author}`;

export default function QuoteApp() {
  const [quotes, setQuotes] = useState<Quote[]>(processQuotes(offlineQuotes as any[]));
  const [current, setCurrent] = useState<Quote | null>(null);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [dailyQuote, setDailyQuote] = useState<Quote | null>(null);
  const [posterize, setPosterize] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fav = localStorage.getItem('quote-favorites');
    if (fav) {
      try { setFavorites(JSON.parse(fav)); } catch { /* ignore */ }
    }
    const custom = localStorage.getItem('custom-quotes');
    if (custom) {
      try {
        const parsed = JSON.parse(custom);
        setQuotes((q) => [...q, ...processQuotes(parsed)]);
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (!quotes.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const stored = localStorage.getItem('daily-quote');
    if (stored) {
      try {
        const obj = JSON.parse(stored);
        if (obj.date === today) {
          setDailyQuote(obj.quote);
          return;
        }
      } catch { /* ignore */ }
    }
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    setDailyQuote(q);
    localStorage.setItem('daily-quote', JSON.stringify({ date: today, quote: q }));
  }, [quotes]);

  const filtered = useMemo(() => {
    const lower = search.toLowerCase();
    return quotes.filter((q) => {
      const matchCategory =
        category === 'favorites'
          ? favorites.includes(keyOf(q))
          : !category || q.tags.includes(category);
      const matchSearch = q.content.toLowerCase().includes(lower);
      return matchCategory && matchSearch;
    });
  }, [quotes, category, search, favorites]);

  const changeQuote = () => {
    if (filtered.length === 0) {
      setCurrent(null);
      return;
    }
    setCurrent(filtered[Math.floor(Math.random() * filtered.length)]);
  };

  useEffect(() => {
    changeQuote();
  }, [filtered]);

  const toggleFavorite = () => {
    if (!current) return;
    const key = keyOf(current);
    setFavorites((favs) => {
      const updated = favs.includes(key)
        ? favs.filter((f) => f !== key)
        : [...favs, key];
      localStorage.setItem('quote-favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const importQuotes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file
      .text()
      .then((text) => {
        try {
          const parsed = JSON.parse(text);
          setQuotes((q) => {
            const processed = processQuotes(parsed);
            const next = [...q, ...processed];
            localStorage.setItem('custom-quotes', JSON.stringify(parsed));
            return next;
          });
        } catch { /* ignore */ }
      })
      .catch(() => { /* ignore */ });
  };

  const shareCard = () => {
    const node = cardRef.current;
    if (!node || !current) return;
    toPng(node)
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'quote.png';
        link.href = dataUrl;
        link.click();
      })
      .catch(() => { /* ignore */ });
  };

  const shareQuote = () => {
    if (!current) return;
    const text = `"${current.content}" — ${current.author}`;
    share(text);
  };

  const categories = useMemo(() => {
    const base = Array.from(
      new Set(
        quotes.flatMap((q) => q.tags).filter((t) => SAFE_CATEGORIES.includes(t))
      )
    );
    return ['favorites', ...base];
  }, [quotes]);

  const isFav = current ? favorites.includes(keyOf(current)) : false;

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-4 overflow-auto">
      {dailyQuote && (
        <div className="mb-4 p-3 bg-gray-700 rounded" id="daily-quote">
          <p className="text-sm italic">"{dailyQuote.content}"</p>
          <p className="text-xs text-gray-300 text-right">- {dailyQuote.author}</p>
        </div>
      )}
      <div className="w-full max-w-md flex flex-col items-center">
        <div ref={cardRef} id="quote-card" className="p-4 text-center">
          {current ? (
            <>
              <p className="text-lg mb-2">&quot;{current.content}&quot;</p>
              <p className="text-sm text-gray-200">- {current.author}</p>
            </>
          ) : (
            <p>No quotes found.</p>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={changeQuote}>
            New Quote
          </button>
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={toggleFavorite}>
            {isFav ? 'Unfavorite' : 'Favorite'}
          </button>
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={shareCard}>
            Share as Card
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => setPosterize((p) => !p)}
          >
            {posterize ? 'Close Posterizer' : 'Posterize'}
          </button>
          {canShare() && (
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={shareQuote}>
              Share
            </button>
          )}
          <label className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer">
            Import
            <input type="file" accept="application/json" className="hidden" onChange={importQuotes} />
          </label>
        </div>
        {posterize && (
          <div className="mt-4 w-full">
            <Posterizer quote={current} />
          </div>
        )}
        <div className="mt-4 flex flex-col w-full gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="px-2 py-1 rounded text-black"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-2 py-1 rounded text-black"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

