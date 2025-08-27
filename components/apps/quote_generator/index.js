
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Filter from 'bad-words';
import { toCanvas } from 'html-to-image';

import offlineQuotes from './quotes.json';

const SAFE_CATEGORIES = [
  'inspirational',
  'life',
  'love',
  'wisdom',
  'technology',
  'humor',
  'general',
];

const CATEGORY_KEYWORDS = {
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

const processQuotes = (data) => {
  const filter = new Filter();
  return data
    .map((q) => {
      const content = q.content || q.quote || '';
      const author = q.author || 'Unknown';
      let tags = Array.isArray(q.tags) ? q.tags.map((t) => t.toLowerCase()) : [];
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
        q.tags.some((t) => SAFE_CATEGORIES.includes(t))
    );
};

const allQuotes = processQuotes(offlineQuotes);

// Seeded PRNG utilities
const xmur3 = (str) => {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
};

const mulberry32 = (a) => {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const createSeededRandom = (seed) => {
  const seedFn = xmur3(String(seed));
  return mulberry32(seedFn());
};

export const copyText = (
  text,
  clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined
) => {
  if (clipboard && clipboard.writeText) {
    clipboard.writeText(text);
  }
};

export const exportFavorites = (favorites) => {
  const dataStr = JSON.stringify(favorites, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'favorites.json';
  link.click();
  URL.revokeObjectURL(url);
};

const getDailySeed = () => {
  const d = new Date();
  return parseInt(d.toISOString().slice(0, 10).replace(/-/g, ''), 10);
};

const QuoteGenerator = () => {
  const [quotes] = useState(allQuotes);
  const [current, setCurrent] = useState(null);
  const [tag, setTag] = useState('');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('quoteFavorites') || '[]');
    } catch {
      return [];
    }
  });
  const [fade, setFade] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const rand = useRef();

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setPrefersReduced(media.matches);
    handler();
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const filteredQuotes = useMemo(
    () =>
      quotes.filter(
        (q) =>
          (!tag || q.tags.includes(tag)) &&
          (!search ||
            q.content.toLowerCase().includes(search.toLowerCase()) ||
            q.author.toLowerCase().includes(search.toLowerCase()))
      ),
    [quotes, tag, search]
  );

  useEffect(() => {
    const seed = getDailySeed();
    rand.current = createSeededRandom(seed);
    if (filteredQuotes.length) {
      const idx = Math.floor(rand.current() * filteredQuotes.length);
      setCurrent(filteredQuotes[idx]);
    } else {
      setCurrent(null);
    }
  }, [filteredQuotes]);

  const changeQuote = () => {
    if (!filteredQuotes.length || !rand.current) return;
    const idx = Math.floor(rand.current() * filteredQuotes.length);
    const newQuote = filteredQuotes[idx];
    if (prefersReduced) {
      setCurrent(newQuote);
    } else {
      setFade(true);
      setTimeout(() => {
        setCurrent(newQuote);
        setFade(false);
      }, 300);
    }
  };

  const copyQuote = () => {
    if (current) {
      copyText(`"${current.content}" - ${current.author}`);
    }
  };

  const tweetQuote = () => {
    if (!current) return;
    const text = `"${current.content}" - ${current.author}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareImage = () => {
    const node = document.getElementById('quote-card');
    if (!node) return;
    toCanvas(node).then((canvas) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        if (
          navigator.share &&
          navigator.canShare &&
          navigator.canShare({ files: [new File([blob], 'quote.png', { type: 'image/png' })] })
        ) {
          const file = new File([blob], 'quote.png', { type: 'image/png' });
          navigator.share({ files: [file], title: 'Quote' });
        } else {
          const link = document.createElement('a');
          link.download = 'quote.png';
          link.href = canvas.toDataURL();
          link.click();
        }
      });
    });
  };

  const toggleFavorite = () => {
    if (!current) return;
    setFavorites((prev) => {
      const exists = prev.some(
        (q) => q.content === current.content && q.author === current.author
      );
      const updated = exists
        ? prev.filter(
            (q) => q.content !== current.content || q.author !== current.author
          )
        : [...prev, current];
      localStorage.setItem('quoteFavorites', JSON.stringify(updated));
      return updated;
    });
  };

  const exportFavs = () => exportFavorites(favorites);

  const isFavorite =
    current &&
    favorites.some(
      (q) => q.content === current.content && q.author === current.author
    );

  const tags = useMemo(
    () =>
      Array.from(new Set(quotes.flatMap((q) => q.tags))).filter((c) =>
        SAFE_CATEGORIES.includes(c)
      ),
    [quotes]
  );

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 overflow-auto">
      <div className="w-full max-w-md flex flex-col items-center">
        <div
          id="quote-card"
          className={`p-4 text-center transition-opacity duration-300 ${
            fade && !prefersReduced ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {current ? (
            <>
              <p className="text-lg mb-2">&quot;{current.content}&quot;</p>
              <p className="text-sm text-gray-300">- {current.author}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {current.tags.map((t) => (
                  <button
                    key={t}
                    className="px-2 py-1 bg-gray-700 rounded text-xs"
                    onClick={() => setTag(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p>No quotes found.</p>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={changeQuote}
          >
            New Quote
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={copyQuote}
          >
            Copy
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={tweetQuote}
          >
            Tweet
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={shareImage}
          >
            Image
          </button>
          <button
            className={`px-4 py-2 rounded ${
              isFavorite
                ? 'bg-yellow-600 hover:bg-yellow-500'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            onClick={toggleFavorite}
          >
            {isFavorite ? 'Unfav' : 'Fav'}
          </button>
          {favorites.length > 0 && (
            <button
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={exportFavs}
            >
              Export
            </button>
          )}
        </div>
        <div className="mt-4 flex flex-col w-full gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="px-2 py-1 rounded text-black"
          />
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="px-2 py-1 rounded text-black"
          >
            <option value="">All Tags</option>
            {tags.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default QuoteGenerator;
export const displayQuoteGenerator = () => <QuoteGenerator />;
