import React, { useEffect, useMemo, useState } from 'react';
import Filter from 'bad-words';
import { toPng } from 'html-to-image';

import offlineQuotes from './quotes.json';
import { TEMPLATES, DEFAULT_TEMPLATE } from './quote_templates';

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
      const lower = q.quote.toLowerCase();
      const tags = [];
      Object.entries(CATEGORY_KEYWORDS).forEach(([cat, keywords]) => {
        if (keywords.some((k) => lower.includes(k))) tags.push(cat);
      });
      if (!tags.length) tags.push('general');
      return { content: q.quote, author: q.author, tags };
    })
    .filter(
      (q) =>
        !filter.isProfane(q.content) &&
        q.tags.some((t) => SAFE_CATEGORIES.includes(t))
    );
};

const allOfflineQuotes = processQuotes(offlineQuotes);

const RATE_LIMIT_MS = 60 * 60 * 1000; // 1 hour

const QuoteGenerator = () => {
  const [quotes, setQuotes] = useState([]);
  const [current, setCurrent] = useState(null);
  const [displayed, setDisplayed] = useState('');
  const [tag, setTag] = useState('');
  const [search, setSearch] = useState('');
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [newQuote, setNewQuote] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [pinned, setPinned] = useState(false);

  const loadLocalQuotes = () => {
    const base = [...allOfflineQuotes];
    try {
      const user = JSON.parse(localStorage.getItem('userQuotes') || '[]');
      base.push(...processQuotes(user));
    } catch {
      /* ignore */
    }
    try {
      const stored = JSON.parse(localStorage.getItem('quotesData') || '[]');
      base.push(...processQuotes(stored));
    } catch {
      /* ignore */
    }
    setQuotes(base);
  };

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setPrefersReduced(media.matches);
    handler();
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('quote');
    const a = params.get('author');
    const t = params.get('template');
    if (t && TEMPLATES[t]) setTemplate(t);
    if (q && a) {
      setCurrent({ content: q, author: a });
      setPinned(true);
    }
  }, []);

  const fetchQuotes = (force = false) => {
    const last = Number(localStorage.getItem('quotesFetchedAt') || '0');
    if (!force && Date.now() - last < RATE_LIMIT_MS) return;
    const etag = localStorage.getItem('quotesEtag');
    fetch('https://dummyjson.com/quotes?limit=500', {
      headers: etag ? { 'If-None-Match': etag } : {},
    })
      .then((res) => {
        if (res.status === 200) {
          const newEtag = res.headers.get('ETag');
          res.json().then((d) => {
            localStorage.setItem('quotesData', JSON.stringify(d.quotes));
            if (newEtag) localStorage.setItem('quotesEtag', newEtag);
            localStorage.setItem('quotesFetchedAt', Date.now().toString());
            loadLocalQuotes();
          });
        }
      })
      .catch(() => {
        /* ignore network errors */
      });
  };

  useEffect(() => {
    loadLocalQuotes();
    fetchQuotes();
  }, []);

  const filteredQuotes = useMemo(
    () =>
      quotes.filter(
        (q) =>
          (!tag || q.tags.includes(tag)) &&
          (!search ||
            q.content.toLowerCase().includes(search.toLowerCase()) ||
            q.author.toLowerCase().includes(search.toLowerCase()) ||
            q.tags.some((t) => t.includes(search.toLowerCase())))
      ),
    [quotes, tag, search]
  );

  useEffect(() => {
    if (pinned) return;
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
  }, [filteredQuotes, pinned]);

  useEffect(() => {
    if (!current) {
      setDisplayed('');
      return;
    }
    if (prefersReduced) {
      setDisplayed(current.content);
      return;
    }
    setDisplayed('');
    let i = 0;
    const text = current.content;
    const id = setInterval(() => {
      setDisplayed((prev) => prev + text[i]);
      i += 1;
      if (i >= text.length) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [current, prefersReduced]);

  const changeQuote = () => {
    if (!filteredQuotes.length) return;
    const newQuote =
      filteredQuotes[Math.floor(Math.random() * filteredQuotes.length)];
    setPinned(false);
    setCurrent(newQuote);
  };

  const copyQuote = () => {
    if (current && navigator.clipboard) {
      navigator.clipboard.writeText(
        `"${current.content}" - ${current.author}`
      );
    }
  };

  const shareOnX = () => {
    if (!current) return;
    const params = new URLSearchParams({
      quote: current.content,
      author: current.author,
      template,
    });
    const shareUrl = `${window.location.origin}/apps/quote-generator?${params.toString()}`;
    const text = `"${current.content}" - ${current.author}`;
    const url =
      `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };

  const copyLink = () => {
    if (!current || !navigator.clipboard) return;
    const params = new URLSearchParams({
      quote: current.content,
      author: current.author,
      template,
    });
    const url = `${window.location.origin}/apps/quote-generator?${params.toString()}`;
    navigator.clipboard.writeText(url);
  };

  const openOgImage = () => {
    if (!current) return;
    const params = new URLSearchParams({
      quote: current.content,
      author: current.author,
      template,
    });
    const url = `${window.location.origin}/apps/quote-generator/og?${params.toString()}`;
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

  const addOfflineQuote = () => {
    if (!newQuote.trim() || !newAuthor.trim()) return;
    const entry = { quote: newQuote.trim(), author: newAuthor.trim() };
    try {
      const stored = JSON.parse(localStorage.getItem('userQuotes') || '[]');
      stored.push(entry);
      localStorage.setItem('userQuotes', JSON.stringify(stored));
    } catch {
      localStorage.setItem('userQuotes', JSON.stringify([entry]));
    }
    setNewQuote('');
    setNewAuthor('');
    loadLocalQuotes();
  };

  const tags = useMemo(
    () =>
      Array.from(new Set(quotes.flatMap((q) => q.tags))).filter((c) =>
        SAFE_CATEGORIES.includes(c)
      ),
    [quotes]
  );

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-panel text-white p-4 overflow-auto">
      <div className="w-full max-w-md flex flex-col items-center">
        <div
          id="quote-card"
          className={`p-4 text-center rounded ${TEMPLATES[template].card}`}
        >
          {current ? (
            <>
              <p className={TEMPLATES[template].quote}>&quot;{displayed}&quot;</p>
              <p className={TEMPLATES[template].author}>- {current.author}</p>
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
            onClick={() => fetchQuotes(true)}
          >
            Refresh
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={copyQuote}
          >
            Copy
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={copyLink}
          >
            Link
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={shareOnX}
          >
            X
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={openOgImage}
          >
            OG
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={exportImage}
          >
            Image
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Quotes provided by{' '}
          <a
            href="https://dummyjson.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            dummyjson.com
          </a>
        </p>
        <div className="mt-4 flex flex-col w-full gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quotes, authors, or tags"
            className="px-2 py-1 rounded text-black"
          />
          <select
            data-testid="tag-filter"
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
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="px-2 py-1 rounded text-black"
          >
            {Object.keys(TEMPLATES).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-6 flex flex-col w-full gap-2">
          <textarea
            value={newQuote}
            onChange={(e) => setNewQuote(e.target.value)}
            placeholder="Your quote"
            className="px-2 py-1 rounded text-black"
            rows={2}
          />
          <input
            value={newAuthor}
            onChange={(e) => setNewAuthor(e.target.value)}
            placeholder="Author"
            className="px-2 py-1 rounded text-black"
          />
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded self-center"
            onClick={addOfflineQuote}
          >
            Add Quote
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuoteGenerator;
export const displayQuoteGenerator = () => <QuoteGenerator />;

