import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [displayedText, setDisplayedText] = useState('');
  const [prefersReduced, setPrefersReduced] = useState(false);
  const rafRef = useRef();

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
    const index =
      Math.abs(
        seed
          .split('')
          .reduce((a, c) => Math.imul(a, 31) + c.charCodeAt(0), 0)
      ) % filteredQuotes.length;
    setCurrent(filteredQuotes[index]);
  }, [filteredQuotes]);

  const changeQuote = () => {
    if (!filteredQuotes.length) return;
    const newQuote =
      filteredQuotes[Math.floor(Math.random() * filteredQuotes.length)];
    setCurrent(newQuote);
  };

  useEffect(() => {
    if (!current) return;
    cancelAnimationFrame(rafRef.current);
    if (prefersReduced) {
      setDisplayedText(current.content);
      return;
    }
    setDisplayedText('');
    let index = 0;
    let last = 0;
    const step = (time) => {
      if (time - last > 50) {
        index++;
        setDisplayedText(current.content.slice(0, index));
        last = time;
      }
      if (index < current.content.length) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [current, prefersReduced]);

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

  const dataUrlToFile = (dataUrl, filename) => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  const shareCard = () => {
    const node = document.getElementById('quote-card');
    if (!node) return;
    requestAnimationFrame(() => {
      toPng(node)
        .then((dataUrl) => {
          const file = dataUrlToFile(dataUrl, 'quote.png');
          const shareData = {
            files: [file],
            title: 'Quote',
            text: current
              ? `"${current.content}" - ${current.author}`
              : 'Quote',
          };
          if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            navigator.share(shareData).catch(() => {
              const link = document.createElement('a');
              link.download = 'quote.png';
              link.href = dataUrl;
              link.click();
            });
          } else {
            const link = document.createElement('a');
            link.download = 'quote.png';
            link.href = dataUrl;
            link.click();
          }
        })
        .catch(() => {
          /* ignore export errors */
        });
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
          role="status"
          aria-live="polite"
          className="p-4 text-center"
        >
          {current ? (
            <>
              <p className="text-lg mb-2">&quot;{displayedText}&quot;</p>
              <p className="text-sm text-gray-200">- {current.author}</p>
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
            onClick={shareCard}
          >
            Share Card
          </button>
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

