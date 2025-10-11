'use client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import PlaylistBuilder from './components/PlaylistBuilder';
import share, { canShare } from '../../utils/share';
import Posterizer from './components/Posterizer';
import copyToClipboard from '../../utils/clipboard';
import {
  getAllQuotes,
  getQuoteKey,
  listSafeTags,
  mergeQuotes,
  normalizeQuotes,
  type Quote,
} from '../../quotes/localQuotes';
import { createRotationQueue } from '../../quotes/rotation';

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

export default function QuoteApp() {
  const [quotes, setQuotes] = useState<Quote[]>(() => getAllQuotes());
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
  const rotationQueueRef = useRef<number[]>([]);
  const lastQuoteRef = useRef<Quote | null>(null);
  const currentRef = useRef<Quote | null>(null);

  useEffect(() => {
    const fav = localStorage.getItem('quote-favorites');
    if (fav) {
      try { setFavorites(JSON.parse(fav)); } catch { /* ignore */ }
    }
    const custom = localStorage.getItem('custom-quotes');
    if (custom) {
      try {
        const parsed = JSON.parse(custom);
        setQuotes((q) => mergeQuotes(q, normalizeQuotes(parsed)));
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
          ? favorites.includes(getQuoteKey(q))
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

  const takeRandomQuote = useCallback(() => {
    if (!filtered.length) {
      rotationQueueRef.current = [];
      setCurrent(null);
      return;
    }

    if (!rotationQueueRef.current.length) {
      rotationQueueRef.current = createRotationQueue(filtered, lastQuoteRef.current);
    }

    const nextIndex = rotationQueueRef.current.shift();
    if (nextIndex == null) return;

    setCurrent(filtered[nextIndex]);
  }, [filtered]);

  const changeQuote = useCallback(() => {
    takeRandomQuote();
  }, [takeRandomQuote]);

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
    if (!filtered.length) {
      rotationQueueRef.current = [];
      setCurrent(null);
      return;
    }

    const active = currentRef.current;
    rotationQueueRef.current = createRotationQueue(filtered, lastQuoteRef.current);

    if (active) {
      const activeKey = getQuoteKey(active);
      const activeIndex = filtered.findIndex((quote) => getQuoteKey(quote) === activeKey);
      if (activeIndex >= 0) {
        rotationQueueRef.current = rotationQueueRef.current.filter((index) => index !== activeIndex);
        return;
      }
    }

    takeRandomQuote();
  }, [filtered, takeRandomQuote]);

  useEffect(() => {
    currentRef.current = current;
    if (!current) return;
    lastQuoteRef.current = current;
    const idx = filtered.findIndex((quote) => getQuoteKey(quote) === getQuoteKey(current));
    if (idx >= 0) {
      rotationQueueRef.current = rotationQueueRef.current.filter((index) => index !== idx);
    }
  }, [current, filtered]);

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
    const key = getQuoteKey(current);
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
            const processed = normalizeQuotes(parsed);
            const next = mergeQuotes(q, processed);
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
    const base = listSafeTags(quotes);
    return ['favorites', ...base];
  }, [quotes]);

  const isFav = current ? favorites.includes(getQuoteKey(current)) : false;

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-4 overflow-auto">
      {dailyQuote && (
        <div className="mb-4 p-3 bg-gray-700 rounded" id="daily-quote">
          <p className="text-sm italic">&ldquo;{dailyQuote.content}&rdquo;</p>
          <p className="text-xs text-gray-300 text-right">- {dailyQuote.author}</p>
        </div>
      )}
      <div className="w-full max-w-md flex flex-col items-center">
        <div
          ref={cardRef}
          id="quote-card"
          className="group relative p-6 rounded text-center bg-gradient-to-br from-[var(--color-primary)]/30 to-[var(--color-secondary)]/30 text-white"
        >
          {current ? (
            <div key={getQuoteKey(current)} className="animate-quote">
              <span
                className="absolute -top-4 left-4 text-[64px] text-white/20 select-none"
                aria-hidden="true"
              >
                &ldquo;
              </span>
              <p className="mb-4 text-[18px] leading-[24px] sm:text-[20px] sm:leading-[26px] tracking-[6px]">
                {current.content}
              </p>
              <p className="text-sm text-white/80">— {current.author}</p>
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition">
                <button
                  onClick={copyQuote}
                  className="p-1 bg-black/30 hover:bg-black/50 rounded"
                  aria-label="Copy quote"
                >
                  <CopyIcon className="w-6 h-6" />
                </button>
                <button
                  onClick={tweetQuote}
                  className="p-1 bg-black/30 hover:bg-black/50 rounded"
                  aria-label="Tweet quote"
                >
                  <TwitterIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col items-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition">
                <button
                  onClick={prevQuote}
                  className="p-2 bg-black/30 hover:bg-black/50 rounded-full"
                  aria-label="Previous quote"
                >
                  ←
                </button>
                <kbd className="mt-1 text-xs text-white/70">←</kbd>
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition">
                <button
                  onClick={nextQuote}
                  className="p-2 bg-black/30 hover:bg-black/50 rounded-full"
                  aria-label="Next quote"
                >
                  →
                </button>
                <kbd className="mt-1 text-xs text-white/70">→</kbd>
              </div>
            </div>
          ) : (
            <p>No quotes found.</p>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={changeQuote}
            disabled={playing}
          >
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
          <input
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
            placeholder="Author"
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
        <PlaylistBuilder quotes={quotes} playlist={playlist} setPlaylist={setPlaylist} />
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={startPlaylist}
            disabled={!playlist.length || playing}
          >
            Play Playlist
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={stopPlaylist}
            disabled={!playing}
          >
            Stop
          </button>
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={loop}
              onChange={(e) => setLoop(e.target.checked)}
            />
            <span>Loop</span>
          </label>
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={shuffle}
              onChange={(e) => setShuffle(e.target.checked)}
            />
            <span>Shuffle</span>
          </label>
        </div>
      </div>
      <style jsx>{`
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

