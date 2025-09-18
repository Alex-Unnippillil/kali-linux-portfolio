"use client";

import { useRef } from 'react';
import useDailyQuote from '../hooks/useDailyQuote';
import { toPng } from 'html-to-image';
import share, { canShare } from '../utils/share';
import copyToClipboard from '../utils/clipboard';

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

export default function DailyQuote() {
  const quote = useDailyQuote();
  const cardRef = useRef<HTMLDivElement>(null);

  const exportCard = () => {
    const node = cardRef.current;
    if (!node || !quote) return;
    toPng(node)
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'daily-quote.png';
        link.href = dataUrl;
        link.click();
      })
      .catch(() => {/* ignore */});
  };

  const shareQuote = () => {
    if (!quote) return;
    const text = `"${quote.content}" — ${quote.author}`;
    share(text);
  };

  const copyQuote = () => {
    if (!quote) return;
    const text = `"${quote.content}" — ${quote.author}`;
    copyToClipboard(text);
  };

  const tweetQuote = () => {
    if (!quote) return;
    const text = `"${quote.content}" — ${quote.author}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <div
        ref={cardRef}
        className="group relative p-6 rounded text-center bg-gradient-to-br from-[var(--color-primary)]/30 to-[var(--color-secondary)]/30 text-white"
      >
        {quote ? (
          <div key={quote.content} className="animate-quote">
            <span
              className="absolute -top-4 left-4 text-[64px] text-white/20 select-none"
              aria-hidden="true"
            >
              &ldquo;
            </span>
            <p className="mb-4 text-[18px] leading-[24px] sm:text-[20px] sm:leading-[26px] tracking-[6px]">
              {quote.content}
            </p>
            <p className="text-sm text-white/80">— {quote.author}</p>
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
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
          </div>
        ) : (
          <p>Loading...</p>
        )}
      </div>
      <div className="flex gap-2 mt-4">
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={exportCard}
          disabled={!quote}
        >
          Export Card
        </button>
        {canShare() && (
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={shareQuote}
            disabled={!quote}
          >
            Share
          </button>
        )}
      </div>
      <style jsx>{`
        .animate-quote {
          opacity: 1;
          transform: translateY(0);
        }

        @media (prefers-reduced-motion: no-preference) {
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
        }
      `}</style>
    </div>
  );
}
