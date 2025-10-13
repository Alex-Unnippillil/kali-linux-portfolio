'use client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Filter from 'bad-words';
import { toPng } from 'html-to-image';
import offlineQuotes from '../../public/quotes/quotes.json';
import PlaylistBuilder from './components/PlaylistBuilder';
import share, { canShare } from '../../utils/share';
import Posterizer from './components/Posterizer';
import copyToClipboard from '../../utils/clipboard';

const CopyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1z" />
    <path d="M20 5H8a2 2 0 0 0-2 2v16h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 18H8V7h12v16z" />
  </svg>
);

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M22.46 6c-.77.35-1.6.58-2.46.69a4.28 4.28 0 0 0 1.88-2.37 8.59 8.59 0 0 1-2.72 1.05 4.24 4.24 0 0 0-7.24 3.87A12.05 12.05 0 0 1 3 4.79a4.24 4.24 0 0 0 1.32 5.67 4.2 4.2 0 0 1-1.92-.53v.06a4.26 4.26 0 0 0 3.41 4.17 4.24 4.24 0 0 1-1.91.07 4.27 4.27 0 0 0 3.97 2.95A8.53 8.53 0 0 1 2 19.54a12.06 12.06 0 0 0 6.29 1.84c7.55 0 11.68-6.26 11.68-11.68 0-.18-.01-.35-.02-.53A8.34 8.34 0 0 0 22.46 6z" />
  </svg>
);

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [dailyQuote, setDailyQuote] = useState<Quote | null>(null);
  const [posterize, setPosterize] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [playlist, setPlaylist] = useState<number[]>([]);
  const [playOrder, setPlayOrder] = useState<number[]>([]);
  const [playIndex, setPlayIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [shuffle, setShuffle] = useState(false);

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
    const params = new URLSearchParams(window.location.search);
    const p = params.get('playlist');
    if (p) {
      const ids = p
        .split(',')
        .map((n) => parseInt(n, 10))
        .filter((n) => !Number.isNaN(n) && n >= 0 && n < quotes.length);
      if (ids.length) {
        setPlaylist(ids);
        setCurrent(quotes[ids[0]]);
      }
    }
  }, [quotes]);

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
    const lowerAuthor = authorFilter.toLowerCase();
    return quotes.filter((q) => {
      const matchCategory =
        category === 'favorites'
          ? favorites.includes(keyOf(q))
          : !category || q.tags.includes(category);
      const matchSearch = q.content.toLowerCase().includes(lower);
      const matchAuthor = q.author.toLowerCase().includes(lowerAuthor);
      return matchCategory && matchSearch && matchAuthor;
    });
  }, [quotes, category, search, authorFilter, favorites]);

  useEffect(() => {
    if (!current) {
      setCurrentIndex(0);
      return;
    }
    const idx = filtered.findIndex(
      (q) => q.content === current.content && q.author === current.author,
    );
    if (idx >= 0) setCurrentIndex(idx);
  }, [current, filtered]);

  const changeQuote = () => {
    if (filtered.length === 0) {
      setCurrent(null);
      return;
    }
    setCurrent(filtered[Math.floor(Math.random() * filtered.length)]);
  };

  const nextQuote = useCallback(() => {
    if (!filtered.length) {
      setCurrent(null);
      return;
    }
    const next = (currentIndex + 1) % filtered.length;
    setCurrent(filtered[next]);
  }, [filtered, currentIndex]);

  const prevQuote = useCallback(() => {
    if (!filtered.length) {
      setCurrent(null);
      return;
    }
    const prev = (currentIndex - 1 + filtered.length) % filtered.length;
    setCurrent(filtered[prev]);
  }, [filtered, currentIndex]);

  useEffect(() => {
    changeQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        nextQuote();
      } else if (e.key === 'ArrowLeft') {
        prevQuote();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nextQuote, prevQuote]);

  useEffect(() => {
    if (!playing || !playOrder.length) return;
    const id = setInterval(() => {
      setPlayIndex((i) => {
        const next = i + 1;
        if (next >= playOrder.length) {
          if (loop) {
            return 0;
          }
          setPlaying(false);
          return i;
        }
        return next;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [playing, playOrder, loop]);

  useEffect(() => {
    if (!playOrder.length) return;
    const idx = playOrder[playIndex];
    if (idx >= 0 && idx < quotes.length) {
      setCurrent(quotes[idx]);
    }
  }, [playIndex, playOrder, quotes]);

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

  const copyQuote = () => {
    if (!current) return;
    const text = `"${current.content}" — ${current.author}`;
    copyToClipboard(text);
  };

  const tweetQuote = () => {
    if (!current) return;
    const text = `"${current.content}" — ${current.author}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const startPlaylist = () => {
    if (!playlist.length) return;
    const order = shuffle
      ? [...playlist].sort(() => Math.random() - 0.5)
      : [...playlist];
    setPlayOrder(order);
    setPlayIndex(0);
    const idx = order[0];
    if (idx >= 0 && idx < quotes.length) setCurrent(quotes[idx]);
    setPlaying(true);
  };

  const stopPlaylist = () => setPlaying(false);

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
    <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-[var(--color-text)] p-4 overflow-auto">
      {dailyQuote && (
        <div
          className="mb-6 w-full max-w-2xl rounded-lg p-4 text-left shadow-lg backdrop-blur kali-panel"
          id="daily-quote"
        >
          <p className="text-base font-medium italic leading-relaxed daily-quote-text">
            &ldquo;{dailyQuote.content}&rdquo;
          </p>
          <p className="mt-2 text-sm font-semibold uppercase tracking-wide daily-quote-author">
            {dailyQuote.author}
          </p>
        </div>
      )}
      <div className="w-full max-w-2xl flex flex-col items-center">
        <div
          ref={cardRef}
          id="quote-card"
          className="group relative w-full overflow-hidden rounded-2xl p-8 text-center shadow-xl backdrop-blur kali-gradient-card"
        >
          {current ? (
            <div key={keyOf(current)} className="animate-quote">
              <span
                className="pointer-events-none absolute -top-6 left-6 text-[96px] font-serif quote-card-glyph"
                aria-hidden="true"
              >
                &ldquo;
              </span>
              <p className="mb-6 text-xl font-medium leading-8 tracking-tight quote-card-content sm:text-2xl sm:leading-9">
                {current.content}
              </p>
              <p className="text-right text-base font-semibold uppercase tracking-[0.35em] quote-card-author">
                {current.author}
              </p>
              <div className="absolute top-3 right-3 flex gap-2 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                <button
                  onClick={copyQuote}
                  className="rounded-full p-1.5 transition kali-icon-button"
                  aria-label="Copy quote"
                >
                  <CopyIcon className="w-6 h-6" />
                </button>
                <button
                  onClick={tweetQuote}
                  className="rounded-full p-1.5 transition kali-icon-button"
                  aria-label="Tweet quote"
                >
                  <TwitterIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="absolute left-4 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                <button
                  onClick={prevQuote}
                  className="rounded-full p-2 text-lg font-semibold transition kali-icon-button"
                  aria-label="Previous quote"
                >
                  ←
                </button>
                <kbd className="text-[10px] font-semibold tracking-widest kbd-hint">←</kbd>
              </div>
              <div className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                <button
                  onClick={nextQuote}
                  className="rounded-full p-2 text-lg font-semibold transition kali-icon-button"
                  aria-label="Next quote"
                >
                  →
                </button>
                <kbd className="text-[10px] font-semibold tracking-widest kbd-hint">→</kbd>
              </div>
            </div>
          ) : (
            <p>No quotes found.</p>
          )}
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            className="px-5 py-2 text-sm font-semibold uppercase tracking-wide transition kali-chip-button kali-chip-button--accent"
            onClick={changeQuote}
            disabled={playing}
          >
            New Quote
          </button>
          <button
            className="px-5 py-2 text-sm font-semibold uppercase tracking-wide transition kali-chip-button"
            onClick={toggleFavorite}
          >
            {isFav ? 'Unfavorite' : 'Favorite'}
          </button>
          <button
            className="px-5 py-2 text-sm font-semibold uppercase tracking-wide transition kali-chip-button"
            onClick={shareCard}
          >
            Share as Card
          </button>
          <button
            className={`px-5 py-2 text-sm font-semibold uppercase tracking-wide transition kali-chip-button ${posterize ? 'kali-chip-button--active' : ''}`}
            onClick={() => setPosterize((p) => !p)}
          >
            {posterize ? 'Close Posterizer' : 'Posterize'}
          </button>
          {canShare() && (
            <button
              className="px-5 py-2 text-sm font-semibold uppercase tracking-wide transition kali-chip-button"
              onClick={shareQuote}
            >
              Share
            </button>
          )}
          <label className="cursor-pointer px-5 py-2 text-sm font-semibold uppercase tracking-wide transition kali-chip-button kali-chip-button--dashed">
            Import
            <input
              type="file"
              accept="application/json"
              className="hidden"
              aria-label="Import custom quotes"
              onChange={importQuotes}
            />
          </label>
        </div>
        {posterize && (
          <div className="mt-4 w-full">
            <Posterizer quote={current} />
          </div>
        )}
        <div className="mt-6 flex w-full flex-col gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full rounded-lg px-3 py-2 text-sm shadow kali-input"
            aria-label="Search quotes"
          />
          <input
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
            placeholder="Author"
            className="w-full rounded-lg px-3 py-2 text-sm shadow kali-input"
            aria-label="Filter by author"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm shadow kali-input"
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <PlaylistBuilder quotes={quotes} playlist={playlist} setPlaylist={setPlaylist} />
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <button
            className="px-5 py-2 text-sm font-semibold uppercase tracking-wide transition kali-chip-button"
            onClick={startPlaylist}
            disabled={!playlist.length || playing}
          >
            Play Playlist
          </button>
          <button
            className="px-5 py-2 text-sm font-semibold uppercase tracking-wide transition kali-chip-button"
            onClick={stopPlaylist}
            disabled={!playing}
          >
            Stop
          </button>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider kali-toggle-label">
            <input
              type="checkbox"
              checked={loop}
              onChange={(e) => setLoop(e.target.checked)}
              className="h-4 w-4 rounded kali-checkbox"
              aria-label="Loop playlist"
            />
            <span>Loop</span>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider kali-toggle-label">
            <input
              type="checkbox"
              checked={shuffle}
              onChange={(e) => setShuffle(e.target.checked)}
              className="h-4 w-4 rounded kali-checkbox"
              aria-label="Shuffle playlist"
            />
            <span>Shuffle</span>
          </label>
        </div>
      </div>
      <style jsx>{`
        .kali-panel {
          background: var(--kali-panel);
          border: 1px solid var(--kali-panel-border);
          color: var(--color-text);
          box-shadow: 0 12px 32px -18px color-mix(in srgb, var(--kali-blue) 32%, transparent);
        }
        .daily-quote-text {
          color: color-mix(in srgb, var(--color-text) 92%, transparent);
        }
        .daily-quote-author {
          color: color-mix(in srgb, var(--color-text) 68%, transparent);
        }
        .kali-gradient-card {
          border: 1px solid var(--kali-panel-border);
          background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--kali-blue) 78%, var(--kali-panel)) 0%,
            color-mix(in srgb, var(--kali-blue-dark) 64%, var(--color-ub-lite-abrgn)) 46%,
            color-mix(in srgb, var(--color-ubt-blue) 58%, var(--color-ub-cool-grey)) 100%
          );
          color: var(--color-text);
          box-shadow: 0 18px 40px -22px color-mix(in srgb, var(--kali-blue) 45%, transparent);
        }
        .quote-card-glyph {
          color: color-mix(in srgb, var(--color-text) 12%, transparent);
        }
        .quote-card-content {
          color: color-mix(in srgb, var(--color-text) 98%, transparent);
        }
        .quote-card-author {
          color: color-mix(in srgb, var(--color-text) 70%, transparent);
        }
        .kali-icon-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--kali-border);
          background: var(--kali-control-surface);
          color: color-mix(in srgb, var(--color-text) 96%, transparent);
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--kali-control) 35%, transparent);
          transition: background var(--motion-fast) ease, border-color var(--motion-fast) ease,
            transform var(--motion-fast) ease;
        }
        .kali-icon-button:hover {
          background: var(--kali-control-overlay);
          border-color: color-mix(in srgb, var(--kali-control) 60%, var(--kali-border));
        }
        .kali-icon-button:focus-visible {
          outline: 2px solid var(--focus-outline-color);
          outline-offset: 2px;
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--kali-control) 35%, transparent);
        }
        .kbd-hint {
          color: color-mix(in srgb, var(--color-text) 55%, transparent);
        }
        .kali-chip-button {
          border-radius: 9999px;
          border: 1px solid var(--kali-border);
          background: color-mix(in srgb, var(--kali-panel) 86%, transparent 14%);
          color: color-mix(in srgb, var(--color-text) 95%, transparent);
          box-shadow: 0 1px 0 0 color-mix(in srgb, var(--kali-blue) 24%, transparent);
        }
        .kali-chip-button:hover {
          background: color-mix(in srgb, var(--kali-control-overlay) 45%, var(--kali-panel));
          border-color: color-mix(in srgb, var(--kali-control) 55%, var(--kali-border));
        }
        .kali-chip-button:focus-visible {
          outline: 2px solid var(--focus-outline-color);
          outline-offset: 2px;
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--kali-control) 35%, transparent);
        }
        .kali-chip-button:disabled {
          cursor: not-allowed;
          background: color-mix(in srgb, var(--kali-panel) 72%, transparent 28%);
          border-color: color-mix(in srgb, var(--kali-border) 65%, transparent 35%);
          color: color-mix(in srgb, var(--color-text) 52%, transparent);
          box-shadow: none;
        }
        .kali-chip-button--accent {
          background: color-mix(in srgb, var(--kali-control) 48%, var(--kali-panel));
          border-color: color-mix(in srgb, var(--kali-control) 68%, var(--kali-border));
          color: var(--color-text);
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--kali-control) 45%, transparent);
        }
        .kali-chip-button--accent:hover {
          background: color-mix(in srgb, var(--kali-control) 62%, var(--kali-panel));
          border-color: color-mix(in srgb, var(--kali-control) 80%, var(--kali-border));
        }
        .kali-chip-button--accent:focus-visible {
          outline-color: var(--focus-outline-color);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--kali-control) 35%, transparent);
        }
        .kali-chip-button--active {
          background: color-mix(in srgb, var(--kali-control) 32%, var(--kali-panel));
          border-color: color-mix(in srgb, var(--kali-control) 60%, var(--kali-border));
        }
        .kali-chip-button--dashed {
          border-style: dashed;
          background: color-mix(in srgb, var(--kali-panel-highlight) 60%, var(--kali-panel));
          color: color-mix(in srgb, var(--color-text) 92%, transparent);
        }
        .kali-input {
          border: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
          background: color-mix(in srgb, var(--color-surface) 55%, var(--color-bg) 45%);
          color: color-mix(in srgb, var(--color-text) 95%, transparent);
        }
        .kali-input::placeholder {
          color: color-mix(in srgb, var(--color-text) 55%, transparent);
        }
        .kali-input:focus {
          outline: 2px solid color-mix(in srgb, var(--color-focus-ring) 80%, transparent);
          outline-offset: 2px;
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-focus-ring) 35%, transparent);
        }
        .kali-toggle-label {
          color: color-mix(in srgb, var(--color-text) 70%, transparent);
        }
        .kali-checkbox {
          border: 1px solid color-mix(in srgb, var(--color-border) 65%, transparent);
          background: color-mix(in srgb, var(--color-dark) 65%, transparent);
          accent-color: var(--color-control-accent);
        }
        .kali-checkbox:focus-visible {
          outline: 2px solid var(--color-focus-ring);
          outline-offset: 2px;
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-focus-ring) 30%, transparent);
        }
        .animate-quote {
          animation: fadeIn 150ms ease-in-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

