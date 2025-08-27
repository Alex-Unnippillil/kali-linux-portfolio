import React, { useEffect, useMemo, useRef, useState } from 'react';
import Filter from 'bad-words';
import { toPng } from 'html-to-image';

import offlineQuotes from './quotes.json';

const SAFE_TAGS = [
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
      // Use provided tags when available, otherwise guess based on keywords
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
        q.tags.some((t) => SAFE_TAGS.includes(t))
    );
};

const allOfflineQuotes = processQuotes(offlineQuotes);

const createRng = (seedStr) => {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
};

const QuoteGenerator = () => {
  const quotes = allOfflineQuotes;
  const [current, setCurrent] = useState(null);
  const [tag, setTag] = useState('');
  const [search, setSearch] = useState('');
  const [seed, setSeed] = useState('');
  const [fade, setFade] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const rngRef = useRef(() => Math.random());

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
    if (!filteredQuotes.length) {
      setCurrent(null);
      return;
    }
    rngRef.current = createRng(seed);
    const index = Math.floor(rngRef.current() * filteredQuotes.length);
    setCurrent(filteredQuotes[index]);
  }, [filteredQuotes, seed]);

  const changeQuote = () => {
    if (!filteredQuotes.length) return;
    const newQuote =
      filteredQuotes[Math.floor(rngRef.current() * filteredQuotes.length)];
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
    if (current && navigator.clipboard) {
      navigator.clipboard.writeText(
        `"${current.content}" - ${current.author}`
      );
    }
  };

  const tweetQuote = () => {
    if (!current) return;
    const text = `"${current.content}" - ${current.author}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const exportImage = () => {
    const node = document.getElementById('quote-card');
    if (!node) return;
    toPng(node).then((dataUrl) => {
      const link = document.createElement('a');
      link.download = 'quote.png';
      link.href = dataUrl;
      link.click();
    });
  };

  const tags = useMemo(
    () =>
      Array.from(new Set(quotes.flatMap((q) => q.tags))).filter((c) =>
        SAFE_TAGS.includes(c)
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
              <p data-testid="quote-content" className="text-lg mb-2">
                &quot;{current.content}&quot;
              </p>
              <p data-testid="quote-author" className="text-sm text-gray-300">
                - {current.author}
              </p>
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
            onClick={exportImage}
          >
            Image
          </button>
        </div>
        <div className="mt-4 flex flex-col w-full gap-2">
          <input
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="Seed"
            className="px-2 py-1 rounded text-black"
          />
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

