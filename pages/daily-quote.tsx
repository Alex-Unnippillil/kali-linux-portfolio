"use client";

import { CopySimple } from '@phosphor-icons/react/dist/ssr/CopySimple';
import { TwitterLogo } from '@phosphor-icons/react/dist/ssr/TwitterLogo';
import { useRef } from 'react';
import useDailyQuote from '../hooks/useDailyQuote';
import { toPng } from 'html-to-image';
import share, { canShare } from '../utils/share';
import copyToClipboard from '../utils/clipboard';

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
                <CopySimple aria-hidden="true" className="h-6 w-6" />
              </button>
              <button
                onClick={tweetQuote}
                className="p-1 bg-black/30 hover:bg-black/50 rounded"
                aria-label="Tweet quote"
              >
                <TwitterLogo aria-hidden="true" className="h-6 w-6" />
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
