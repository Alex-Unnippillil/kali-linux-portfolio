import React, { useEffect, useMemo, useState } from 'react';
import { toPng } from 'html-to-image';

import offlineQuotes from './quotes.json';

const QuoteGenerator = () => {
  const [tag, setTag] = useState('');
  const [current, setCurrent] = useState(null);
  const [remaining, setRemaining] = useState([]);

  const tags = useMemo(() => {
    const set = new Set();
    offlineQuotes.forEach((q) => {
      if (Array.isArray(q.tags)) q.tags.forEach((t) => set.add(t));
    });
    return Array.from(set);
  }, []);

  const resetQuotes = (t) => {
    const filtered = offlineQuotes.filter((q) => !t || q.tags.includes(t));
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    setCurrent(shuffled[0] || null);
    setRemaining(shuffled.slice(1));
  };

  useEffect(() => {
    resetQuotes(tag);
  }, [tag]);

  const changeQuote = () => {
    if (!remaining.length) {
      resetQuotes(tag);
      return;
    }
    const [next, ...rest] = remaining;
    setCurrent(next);
    setRemaining(rest);
  };

  const copyQuote = () => {
    if (current && navigator.clipboard) {
      navigator.clipboard.writeText(`"${current.content}" - ${current.author}`);
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

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 overflow-auto">
      <div className="w-full max-w-md flex flex-col items-center">
        <div id="quote-card" className="p-4 text-center">
          {current ? (
            <>
              <p className="text-lg mb-2">&quot;{current.content}&quot;</p>
              <p className="text-sm text-gray-300">- {current.author}</p>
            </>
          ) : (
            <p>No quotes available.</p>
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
        <div className="mt-4 flex w-full">
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="px-2 py-1 rounded text-black w-full"
          >
            <option value="">All Tags</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default QuoteGenerator;
export const displayQuoteGenerator = () => <QuoteGenerator />;
