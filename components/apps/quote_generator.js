import React, { useState, useEffect } from 'react';

const quotes = [
  "The only limit to our realization of tomorrow is our doubts of today.",
  "In the middle of difficulty lies opportunity.",
  "Life is 10% what happens to us and 90% how we react to it.",
  "The purpose of our lives is to be happy.",
];

const QuoteGenerator = () => {
  const [quote, setQuote] = useState('');
  const [fade, setFade] = useState(true);

  const getRandomQuote = () => quotes[Math.floor(Math.random() * quotes.length)];

  const changeQuote = () => {
    setFade(true);
    setTimeout(() => {
      setQuote(getRandomQuote());
      setFade(false);
    }, 300);
  };

  useEffect(() => {
    changeQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyQuote = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(quote);
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <p className={`text-center text-lg mb-4 transition-opacity duration-300 ${fade ? 'opacity-0' : 'opacity-100'}`}>{quote}</p>
      <div className="flex space-x-2">
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
          Copy Quote
        </button>
      </div>
    </div>
  );
};

export default QuoteGenerator;
export const displayQuoteGenerator = () => <QuoteGenerator />;

