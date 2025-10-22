'use client';

import {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
  type CSSProperties,
  type SVGProps,
} from 'react';
import rawQuotes from '../../data/quotes/spotlight.json';
import { useTheme } from '../../hooks/useTheme';
import { isDarkTheme } from '../../utils/theme';
import copyToClipboard from '../../utils/clipboard';
import shareQuote, { canShare } from '../../utils/share';

interface QuoteFixture {
  content: string;
  author: string;
  tags: string[];
}

interface Quote extends QuoteFixture {
  id: string;
}

const SOURCE_QUOTES: Quote[] = (rawQuotes as QuoteFixture[]).map((quote, index) => ({
  id: `${quote.author.replace(/\s+/g, '-').toLowerCase()}-${index}`,
  content: quote.content.trim(),
  author: quote.author.trim(),
  tags: quote.tags.map((tag) => tag.toLowerCase()),
}));

const ALL_TAGS = Array.from(
  new Set(SOURCE_QUOTES.flatMap((quote) => quote.tags))
).sort();

type TagPalette = {
  accent: string;
  lightGradient: string;
  darkGradient: string;
  chipLight: string;
  chipDark: string;
  shadow: string;
};

const TAG_PALETTES: Record<string, TagPalette> = {
  inspiration: {
    accent: '#f97316',
    lightGradient:
      'linear-gradient(135deg, #fff7ed 0%, #fde68a 50%, #fcd34d 100%)',
    darkGradient:
      'linear-gradient(135deg, rgba(251,146,60,0.22) 0%, rgba(194,65,12,0.38) 100%)',
    chipLight: 'bg-orange-100 text-orange-900 border border-orange-300',
    chipDark: 'bg-orange-500/20 text-orange-100 border border-orange-400/30',
    shadow: 'shadow-orange-500/30',
  },
  technology: {
    accent: '#38bdf8',
    lightGradient:
      'linear-gradient(135deg, #e0f2fe 0%, #bfdbfe 52%, #c4b5fd 100%)',
    darkGradient:
      'linear-gradient(135deg, rgba(56,189,248,0.2) 0%, rgba(14,116,144,0.35) 100%)',
    chipLight: 'bg-sky-100 text-sky-900 border border-sky-300',
    chipDark: 'bg-sky-500/20 text-sky-100 border border-sky-400/30',
    shadow: 'shadow-sky-500/30',
  },
  wisdom: {
    accent: '#a855f7',
    lightGradient:
      'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 45%, #c4b5fd 100%)',
    darkGradient:
      'linear-gradient(135deg, rgba(168,85,247,0.22) 0%, rgba(76,29,149,0.4) 100%)',
    chipLight: 'bg-violet-100 text-violet-900 border border-violet-300',
    chipDark: 'bg-violet-500/25 text-violet-100 border border-violet-400/30',
    shadow: 'shadow-violet-500/30',
  },
  creativity: {
    accent: '#ec4899',
    lightGradient:
      'linear-gradient(135deg, #fdf2f8 0%, #fbcfe8 55%, #f9a8d4 100%)',
    darkGradient:
      'linear-gradient(135deg, rgba(236,72,153,0.24) 0%, rgba(190,24,93,0.38) 100%)',
    chipLight: 'bg-pink-100 text-pink-900 border border-pink-300',
    chipDark: 'bg-pink-500/20 text-pink-100 border border-pink-400/30',
    shadow: 'shadow-pink-500/30',
  },
  focus: {
    accent: '#22d3ee',
    lightGradient:
      'linear-gradient(135deg, #ccfbf1 0%, #a5f3fc 52%, #bae6fd 100%)',
    darkGradient:
      'linear-gradient(135deg, rgba(34,211,238,0.22) 0%, rgba(8,145,178,0.36) 100%)',
    chipLight: 'bg-cyan-100 text-cyan-900 border border-cyan-300',
    chipDark: 'bg-cyan-500/20 text-cyan-100 border border-cyan-400/30',
    shadow: 'shadow-cyan-500/30',
  },
  leadership: {
    accent: '#f59e0b',
    lightGradient:
      'linear-gradient(135deg, #fef3c7 0%, #fde68a 48%, #fbbf24 100%)',
    darkGradient:
      'linear-gradient(135deg, rgba(245,158,11,0.24) 0%, rgba(180,83,9,0.36) 100%)',
    chipLight: 'bg-amber-100 text-amber-900 border border-amber-300',
    chipDark: 'bg-amber-500/20 text-amber-100 border border-amber-400/30',
    shadow: 'shadow-amber-500/30',
  },
  resilience: {
    accent: '#facc15',
    lightGradient:
      'linear-gradient(135deg, #fefce8 0%, #fef08a 45%, #facc15 100%)',
    darkGradient:
      'linear-gradient(135deg, rgba(250,204,21,0.22) 0%, rgba(202,138,4,0.36) 100%)',
    chipLight: 'bg-yellow-100 text-yellow-900 border border-yellow-300',
    chipDark: 'bg-yellow-500/20 text-yellow-100 border border-yellow-400/30',
    shadow: 'shadow-yellow-500/30',
  },
  mindfulness: {
    accent: '#60a5fa',
    lightGradient:
      'linear-gradient(135deg, #dbeafe 0%, #c7d2fe 50%, #fbcfe8 100%)',
    darkGradient:
      'linear-gradient(135deg, rgba(96,165,250,0.24) 0%, rgba(37,99,235,0.35) 100%)',
    chipLight: 'bg-indigo-100 text-indigo-900 border border-indigo-300',
    chipDark: 'bg-indigo-500/20 text-indigo-100 border border-indigo-400/30',
    shadow: 'shadow-indigo-500/30',
  },
  design: {
    accent: '#34d399',
    lightGradient:
      'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 48%, #a5f3fc 100%)',
    darkGradient:
      'linear-gradient(135deg, rgba(52,211,153,0.24) 0%, rgba(15,118,110,0.36) 100%)',
    chipLight: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
    chipDark: 'bg-emerald-500/20 text-emerald-100 border border-emerald-400/30',
    shadow: 'shadow-emerald-500/30',
  },
  growth: {
    accent: '#10b981',
    lightGradient:
      'linear-gradient(135deg, #dcfce7 0%, #a7f3d0 45%, #86efac 100%)',
    darkGradient:
      'linear-gradient(135deg, rgba(16,185,129,0.22) 0%, rgba(5,150,105,0.38) 100%)',
    chipLight: 'bg-green-100 text-green-900 border border-green-300',
    chipDark: 'bg-green-500/20 text-green-100 border border-green-400/30',
    shadow: 'shadow-green-500/30',
  },
};

const DEFAULT_PALETTE: TagPalette = {
  accent: '#38bdf8',
  lightGradient: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
  darkGradient: 'linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(30,41,59,0.9) 100%)',
  chipLight: 'bg-slate-100 text-slate-900 border border-slate-300',
  chipDark: 'bg-slate-700/50 text-slate-100 border border-slate-600',
  shadow: 'shadow-slate-600/30',
};

const getPalette = (quote: Quote | null) => {
  const primaryTag = quote?.tags.find((tag) => TAG_PALETTES[tag]);
  return primaryTag ? TAG_PALETTES[primaryTag] : DEFAULT_PALETTE;
};

const CopyIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1z" />
    <path d="M20 5H8a2 2 0 0 0-2 2v16h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 18H8V7h12v16z" />
  </svg>
);

const ShareIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M18 16a3 3 0 0 0-2.33 1.12l-6.2-3.1A3 3 0 0 0 9.5 12a3 3 0 0 0-.03-.41l6.21-3.11A3 3 0 1 0 15 6a2.97 2.97 0 0 0 .03.41L8.82 9.52A3 3 0 1 0 9 15a2.97 2.97 0 0 0-.03-.41l6.21 3.11A3 3 0 1 0 18 16z" />
  </svg>
);

const ArrowIcon = (
  props: SVGProps<SVGSVGElement> & { direction?: 'left' | 'right' }
) => {
  const { direction = 'right', className, ...rest } = props;
  if (direction === 'left') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={className}
        {...rest}
      >
        <path d="M19 12H5" />
        <path d="m11 6-6 6 6 6" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
};

const SearchIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} {...props}>
    <circle cx="11" cy="11" r="7" stroke="currentColor" />
    <path d="m20 20-3.5-3.5" stroke="currentColor" strokeLinecap="round" />
  </svg>
);

const QuoteExperience = () => {
  const { theme } = useTheme();
  const darkMode = isDarkTheme(theme);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [avoidRepeats, setAvoidRepeats] = useState(true);
  const [deckOrder, setDeckOrder] = useState<number[]>([]);
  const [deckPosition, setDeckPosition] = useState(0);
  const [rotationDirection, setRotationDirection] = useState<'next' | 'prev'>(
    'next'
  );
  const [copyTooltip, setCopyTooltip] = useState('Copy quote');
  const [shareTooltip, setShareTooltip] = useState('Share quote');
  const tooltipTimers = useRef<{ copy: number | null; share: number | null }>({
    copy: null,
    share: null,
  });
  const statusTimer = useRef<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(canShare());
    const timers = tooltipTimers.current;
    const statusRef = statusTimer;
    return () => {
      if (timers.copy) {
        window.clearTimeout(timers.copy);
      }
      if (timers.share) {
        window.clearTimeout(timers.share);
      }
      if (statusRef.current) {
        window.clearTimeout(statusRef.current);
      }
    };
  }, []);

  const filteredQuotes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!selectedTags.length && !query) return SOURCE_QUOTES;
    return SOURCE_QUOTES.filter((quote) => {
      const matchesTags =
        !selectedTags.length || selectedTags.every((tag) => quote.tags.includes(tag));
      if (!matchesTags) return false;
      if (!query) return true;
      return (
        quote.content.toLowerCase().includes(query) ||
        quote.author.toLowerCase().includes(query)
      );
    });
  }, [searchTerm, selectedTags]);

  const refreshDeck = useCallback(() => {
    const indices = filteredQuotes.map((_, index) => index);
    const order = avoidRepeats
      ? (() => {
          const shuffled = [...indices];
          for (let i = shuffled.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        })()
      : indices;
    setDeckOrder(order);
    return order;
  }, [filteredQuotes, avoidRepeats]);

  useEffect(() => {
    if (!filteredQuotes.length) {
      setDeckOrder([]);
      setDeckPosition(0);
      return;
    }
    const order = refreshDeck();
    setDeckPosition(0);
    if (order.length <= 1) {
      setRotationDirection('next');
    }
  }, [filteredQuotes, refreshDeck]);

  const currentQuote = useMemo(() => {
    if (!deckOrder.length || !filteredQuotes.length) return null;
    const safePosition = Math.min(deckPosition, deckOrder.length - 1);
    const activeIndex = deckOrder[safePosition];
    return filteredQuotes[activeIndex] ?? null;
  }, [deckOrder, deckPosition, filteredQuotes]);

  const palette = getPalette(currentQuote);

  const announceStatus = useCallback((message: string) => {
    setStatusMessage(message);
    if (statusTimer.current) {
      window.clearTimeout(statusTimer.current);
    }
    statusTimer.current = window.setTimeout(() => {
      setStatusMessage(null);
    }, 2200);
  }, []);

  const resetTooltip = useCallback((type: 'copy' | 'share') => {
    const key: keyof typeof tooltipTimers.current = type;
    if (tooltipTimers.current[key]) {
      window.clearTimeout(tooltipTimers.current[key]!);
    }
    tooltipTimers.current[key] = window.setTimeout(() => {
      if (type === 'copy') {
        setCopyTooltip('Copy quote');
      } else {
        setShareTooltip('Share quote');
      }
    }, 1800);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!currentQuote) return;
    const text = `${currentQuote.content} — ${currentQuote.author}`;
    const success = await copyToClipboard(text);
    setCopyTooltip(success ? 'Copied!' : 'Copy failed');
    announceStatus(
      success ? 'Quote copied to clipboard.' : 'We could not copy that quote.'
    );
    resetTooltip('copy');
  }, [currentQuote, announceStatus, resetTooltip]);

  const handleShare = useCallback(async () => {
    if (!currentQuote) return;
    if (!canNativeShare) {
      setShareTooltip('Sharing unavailable');
      announceStatus('Sharing is not supported in this browser.');
      resetTooltip('share');
      return;
    }
    const success = await shareQuote(
      `${currentQuote.content} — ${currentQuote.author}`,
      currentQuote.author,
      typeof window !== 'undefined' ? window.location.href : undefined
    );
    setShareTooltip(success ? 'Shared!' : 'Share failed');
    announceStatus(
      success ? 'Opening the share sheet.' : 'We could not open the share sheet.'
    );
    resetTooltip('share');
  }, [currentQuote, canNativeShare, announceStatus, resetTooltip]);

  const handleNext = useCallback(() => {
    if (!filteredQuotes.length || !deckOrder.length) return;
    setRotationDirection('next');
    setDeckPosition((position) => {
      const next = position + 1;
      if (next >= deckOrder.length) {
        if (avoidRepeats) {
          const order = refreshDeck();
          return order.length ? 0 : 0;
        }
        return 0;
      }
      return next;
    });
  }, [filteredQuotes.length, deckOrder.length, avoidRepeats, refreshDeck]);

  const handlePrevious = useCallback(() => {
    if (!filteredQuotes.length || !deckOrder.length) return;
    setRotationDirection('prev');
    setDeckPosition((position) => {
      if (position <= 0) {
        return deckOrder.length ? deckOrder.length - 1 : 0;
      }
      return position - 1;
    });
  }, [filteredQuotes.length, deckOrder.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrevious();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleNext, handlePrevious]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSearchTerm('');
  };

  const currentDeckRemaining = useMemo(() => {
    if (!avoidRepeats || !deckOrder.length) return null;
    return Math.max(deckOrder.length - deckPosition - 1, 0);
  }, [avoidRepeats, deckOrder.length, deckPosition]);

  const backgroundStyle: CSSProperties = darkMode
    ? {
        background:
          'linear-gradient(145deg, rgba(2,6,23,1) 0%, rgba(15,23,42,1) 45%, rgba(30,41,59,1) 100%)',
      }
    : {
        background:
          'linear-gradient(145deg, rgba(241,245,249,1) 0%, rgba(224,242,254,1) 45%, rgba(237,233,254,1) 100%)',
      };

  const cardStyle: CSSProperties = {
    backgroundImage: darkMode ? palette.darkGradient : palette.lightGradient,
  };

  const accentColor = palette.accent;

  const accentRing: CSSProperties = {
    '--tw-ring-color': accentColor,
    '--tw-ring-offset-color': 'transparent',
  } as CSSProperties;

  const hasFilters = selectedTags.length > 0 || searchTerm.trim().length > 0;

  return (
    <div
      className="min-h-full w-full overflow-y-auto px-4 py-8 sm:px-8"
      style={backgroundStyle}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-slate-500 dark:text-slate-400">
              Quote Rotation
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
              Signal Boost Deck
            </h1>
            <p className="mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-400">
              Spin through curated quotes by theme. Use filters, search, and the repeat
              guard to guide the flow.
            </p>
          </div>
          <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/70 bg-white/60 p-4 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/50">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Prevent repeats until reset
            </span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                role="switch"
                aria-checked={avoidRepeats}
                aria-label="Toggle repeat prevention"
                onClick={() => setAvoidRepeats((prev) => !prev)}
                className={`relative inline-flex h-7 w-14 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  avoidRepeats
                    ? 'bg-emerald-400/80 focus-visible:ring-emerald-300'
                    : 'bg-slate-400/60 focus-visible:ring-slate-300 dark:focus-visible:ring-slate-600'
                }`}
                style={accentRing}
              >
                <span
                  className={`h-6 w-6 transform rounded-full bg-white shadow-lg transition ${
                    avoidRepeats ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {avoidRepeats
                  ? 'Every quote appears once per deck.'
                  : 'Quotes cycle in a continuous loop.'}
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <section className="relative">
            <div
              className={`relative overflow-hidden rounded-3xl border border-white/70 bg-white/80 p-[1px] shadow-2xl transition-shadow dark:border-white/10 dark:bg-white/5 ${
                palette.shadow
              }`}
            >
              <div
                className="relative h-full w-full rounded-[calc(theme(borderRadius.3xl)-1px)] px-8 py-10 text-left text-slate-900 shadow-inner backdrop-blur dark:text-slate-100 sm:px-12 sm:py-12"
                style={cardStyle}
              >
                <div
                  className="pointer-events-none absolute -left-24 -top-24 h-52 w-52 rounded-full opacity-40 blur-3xl transition-all duration-700"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${accentColor}55, transparent 70%)`,
                  }}
                />
                <div
                  className="pointer-events-none absolute -bottom-16 -right-20 h-56 w-56 rounded-full opacity-30 blur-3xl transition-all duration-700"
                  style={{
                    background: `radial-gradient(circle at 70% 70%, ${accentColor}44, transparent 70%)`,
                  }}
                />

                {currentQuote ? (
                  <div
                    key={currentQuote.id}
                    className={`flex h-full min-h-[16rem] flex-col justify-between gap-8 ${
                      rotationDirection === 'next'
                        ? 'animate-quote-next'
                        : 'animate-quote-prev'
                    }`}
                  >
                    <div className="flex flex-col gap-6">
                      <span className="text-sm font-semibold uppercase tracking-[0.55em] text-slate-700/70 dark:text-slate-200/70">
                        {currentQuote.tags[0] ?? 'quote'}
                      </span>
                      <p className="text-2xl font-serif leading-[1.6] text-slate-900 drop-shadow-sm dark:text-slate-50 sm:text-3xl">
                        “{currentQuote.content}”
                      </p>
                    </div>
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                      <div className="flex flex-col gap-3">
                        <p
                          className="text-base font-semibold uppercase tracking-[0.35em]"
                          style={{ color: accentColor }}
                        >
                          {currentQuote.author}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {currentQuote.tags.map((tag) => {
                            const tagPalette = TAG_PALETTES[tag] ?? DEFAULT_PALETTE;
                            const chipClass = darkMode
                              ? tagPalette.chipDark
                              : tagPalette.chipLight;
                            return (
                              <span
                                key={`${currentQuote.id}-${tag}`}
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] ${chipClass}`}
                              >
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-end">
                        <button
                          type="button"
                          onClick={handlePrevious}
                          aria-label="Show previous quote"
                          className="group flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/50 text-slate-700 shadow-lg transition hover:scale-105 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:text-white"
                          style={accentRing}
                        >
                          <ArrowIcon
                            direction="left"
                            className="h-6 w-6 transition-transform group-hover:-translate-x-1"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={handleNext}
                          aria-label="Show next quote"
                          className="group flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/50 text-slate-700 shadow-lg transition hover:scale-105 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:text-white"
                          style={accentRing}
                        >
                          <ArrowIcon className="h-6 w-6 transition-transform group-hover:translate-x-1" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-4 text-center text-slate-700 dark:text-slate-200">
                    <p className="text-lg font-semibold tracking-tight">
                      No quotes match your filters.
                    </p>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="rounded-full border border-slate-300/80 bg-white/60 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:border-slate-500"
                    >
                      Reset filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside>
            <div className="flex h-full flex-col gap-6 rounded-3xl border border-slate-200/70 bg-white/70 p-6 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/60">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-2 text-sm text-slate-600 shadow-inner dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-300">
                <SearchIcon className="h-5 w-5 text-slate-400" />
                <span className="sr-only">Search quotes</span>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by quote or author"
                  aria-label="Search quotes"
                  className="w-full bg-transparent text-base text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                {ALL_TAGS.map((tag) => {
                  const paletteForTag = TAG_PALETTES[tag] ?? DEFAULT_PALETTE;
                  const isActive = selectedTags.includes(tag);
                  const classes = isActive
                    ? darkMode
                      ? paletteForTag.chipDark
                      : paletteForTag.chipLight
                    : darkMode
                    ? 'border border-slate-700/70 bg-slate-900/40 text-slate-200'
                    : 'border border-slate-200 bg-white/70 text-slate-700';
                  const tagRing: CSSProperties = {
                    '--tw-ring-color': paletteForTag.accent,
                    '--tw-ring-offset-color': 'transparent',
                  } as CSSProperties;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`group inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold capitalize tracking-wide transition hover:translate-y-[-1px] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${classes}`}
                      aria-pressed={isActive}
                      style={tagRing}
                    >
                      <span>{tag}</span>
                      <span
                        className={`text-xs font-semibold uppercase tracking-[0.3em] transition-transform group-hover:scale-105 ${
                          isActive ? 'opacity-100' : 'opacity-40'
                        }`}
                      >
                        ●
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-auto space-y-3 rounded-2xl border border-dashed border-slate-300/70 p-4 text-sm text-slate-600 dark:border-slate-600/70 dark:text-slate-300">
                <p>
                  Use the arrow keys or the controls to rotate quotes. When the deck
                  resets, a fresh shuffle keeps the inspiration flowing.
                </p>
                {currentDeckRemaining !== null && (
                  <p className="font-semibold text-slate-700 dark:text-slate-200">
                    {currentDeckRemaining > 0
                      ? `${currentDeckRemaining} quote${
                          currentDeckRemaining === 1 ? '' : 's'
                        } before the deck resets.`
                      : 'Deck resets on the next quote.'}
                  </p>
                )}
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-full border border-slate-300/80 bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.35em] text-slate-600 transition hover:border-slate-400 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 dark:border-slate-600/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:text-slate-100"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="group relative">
              <button
                type="button"
                onClick={handleCopy}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white/70 text-slate-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:border-slate-600/60 dark:bg-slate-900/60 dark:text-slate-200"
                aria-label="Copy quote"
                style={accentRing}
              >
                <CopyIcon className="h-5 w-5" />
              </button>
              <span
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-max -translate-x-1/2 rounded-full bg-slate-900/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-100 opacity-0 shadow-lg transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
              >
                {copyTooltip}
              </span>
            </div>
            <div className="group relative">
              <button
                type="button"
                onClick={handleShare}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white/70 text-slate-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600/60 dark:bg-slate-900/60 dark:text-slate-200"
                aria-label="Share quote"
                aria-disabled={!canNativeShare}
                disabled={!canNativeShare}
                style={accentRing}
              >
                <ShareIcon className="h-5 w-5" />
              </button>
              <span
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-max -translate-x-1/2 rounded-full bg-slate-900/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-100 opacity-0 shadow-lg transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
              >
                {shareTooltip}
              </span>
            </div>
          </div>
          <div className="text-sm font-medium uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
            {filteredQuotes.length}{' '}
            {filteredQuotes.length === 1 ? 'quote' : 'quotes'} ready to spin
          </div>
        </div>

        <div className="sr-only" role="status" aria-live="polite">
          {statusMessage ?? ''}
        </div>
      </div>

      <style jsx>{`
        @keyframes quoteNext {
          0% {
            opacity: 0;
            transform: translateY(16px) rotate(-1.5deg) scale(0.97);
          }
          55% {
            opacity: 1;
            transform: translateY(-6px) rotate(1deg) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateY(0) rotate(0deg) scale(1);
          }
        }
        @keyframes quotePrev {
          0% {
            opacity: 0;
            transform: translateY(-16px) rotate(1.5deg) scale(0.97);
          }
          55% {
            opacity: 1;
            transform: translateY(6px) rotate(-1deg) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateY(0) rotate(0deg) scale(1);
          }
        }
        .animate-quote-next {
          animation: quoteNext 640ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .animate-quote-prev {
          animation: quotePrev 640ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-quote-next,
          .animate-quote-prev {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
};

export default QuoteExperience;

