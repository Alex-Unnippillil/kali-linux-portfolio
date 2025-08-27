import React, { useEffect, useMemo, useState } from 'react';
import Filter from 'bad-words';
import { toPng } from 'html-to-image';

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
        q.tags.some((t) => SAFE_CATEGORIES.includes(t))
    );
};

const allOfflineQuotes = processQuotes(offlineQuotes);

const QuoteGenerator = () => {
  const [quotes, setQuotes] = useState(allOfflineQuotes);
  const [current, setCurrent] = useState(null);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [fade, setFade] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setPrefersReduced(media.matches);
    handler();
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const etag = localStorage.getItem('quotesEtag');
    const stored = localStorage.getItem('quotesData');
    if (stored) {
      try {
        setQuotes(processQuotes(JSON.parse(stored)));
      } catch {
        // ignore parse error
      }
    }

    fetch('https://api.quotable.io/quotes?limit=500', {
      headers: etag ? { 'If-None-Match': etag } : {},
    })
      .then((res) => {
        if (res.status === 200) {
          const newEtag = res.headers.get('ETag');
          res
            .json()
            .then((d) => {
              localStorage.setItem('quotesData', JSON.stringify(d.results));
              if (newEtag) localStorage.setItem('quotesEtag', newEtag);
              setQuotes(processQuotes(d.results));
            })
            .catch(() => {
              /* ignore parse errors */
            });
        }
      })
      .catch(() => {
        /* ignore network errors */
      });
  }, []);

  const filteredQuotes = useMemo(
    () =>
      quotes.filter(
        (q) =>
          (!category || q.tags.includes(category)) &&
          (!search ||
            q.content.toLowerCase().includes(search.toLowerCase()) ||
            q.author.toLowerCase().includes(search.toLowerCase()))
      ),
    [quotes, category, search]
  );

  useEffect(() => {
    if (!filteredQuotes.length) {
      setCurrent(null);
      return;
    }
    const seed = new Date().toISOString().slice(0, 10);
    const seedIndex =
      Math.abs(
        seed
          .split('')
          .reduce((a, c) => Math.imul(a, 31) + c.charCodeAt(0), 0)
      ) % filteredQuotes.length;
    setIndex(seedIndex);
    setCurrent(filteredQuotes[seedIndex]);
  }, [filteredQuotes]);

  useEffect(() => {
    if (filteredQuotes.length) {
      setCurrent(filteredQuotes[index % filteredQuotes.length]);
    }
  }, [index, filteredQuotes]);

  const changeQuote = (dir = 1) => {
    if (!filteredQuotes.length) return;
    const newIndex =
      (index + dir + filteredQuotes.length) % filteredQuotes.length;
    if (prefersReduced) {
      setIndex(newIndex);
    } else {
      setDirection(dir);
      setFade(true);
      setTimeout(() => {
        setIndex(newIndex);
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

  const categories = useMemo(
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
          className={`p-4 quote-generator-text transition-opacity transition-transform duration-300 ${
            fade && !prefersReduced
              ? `opacity-0 ${direction === 1 ? '-translate-x-4' : 'translate-x-4'}`
              : 'opacity-100 translate-x-0'
          }`}
        >
          {current ? (
            <>
              <p className="text-lg mb-2">&quot;{current.content}&quot;</p>
              <p className="text-sm text-gray-300">- {current.author}</p>
            </>
          ) : (
            <p>No quotes found.</p>
          )}
        </div>
        <div className="quote-generator-controls">
          <button onClick={() => changeQuote(-1)}>Prev</button>
          <button onClick={() => changeQuote(1)}>Next</button>
          <button onClick={copyQuote}>Copy</button>
          <button onClick={tweetQuote}>Tweet</button>
          <button onClick={exportImage}>Image</button>
        </div>
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
};

export default QuoteGenerator;

