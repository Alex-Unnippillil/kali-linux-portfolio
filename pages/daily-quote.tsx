import { useRef } from 'react';
import useDailyQuote from '../hooks/useDailyQuote';
import { toPng } from 'html-to-image';
import share, { canShare } from '../utils/share';

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <div
        ref={cardRef}
        className="p-6 rounded text-center bg-gradient-to-br from-[var(--color-primary)]/30 to-[var(--color-secondary)]/30 text-white"
      >
        {quote ? (
          <>
            <p className="text-3xl sm:text-4xl mb-4">&ldquo;{quote.content}&rdquo;</p>
            <p className="text-sm text-white/80">— {quote.author}</p>
          </>
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
    </div>
  );
}
