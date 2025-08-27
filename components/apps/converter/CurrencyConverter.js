import React, { useState, useEffect } from 'react';

const CurrencyConverter = () => {
  const [rates, setRates] = useState({});
  const [base, setBase] = useState('USD');
  const [quote, setQuote] = useState('EUR');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    const cacheKey = `currencyRates_${base}`;
    const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
    if (cached) {
      try {
        const { rates, timestamp } = JSON.parse(cached);
        setRates(rates);
        setLastUpdated(timestamp);
      } catch {
        /* ignore */
      }
    }
    fetch(`https://api.exchangerate.host/latest?base=${base}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.rates) {
          setRates(data.rates);
          const ts = new Date().toISOString();
          setLastUpdated(ts);
          if (typeof window !== 'undefined') {
            localStorage.setItem(cacheKey, JSON.stringify({ rates: data.rates, timestamp: ts }));
          }
        }
      })
      .catch(() => {});
  }, [base]);

  useEffect(() => {
    if (!amount || !rates[quote]) {
      setResult('');
      return;
    }
    const converted = parseFloat(amount) * rates[quote];
    setResult(converted.toFixed(2));
  }, [amount, quote, rates]);

  const currencyOptions = [base, ...Object.keys(rates)].sort();

  return (
    <div className="bg-gray-700 p-4 rounded flex flex-col gap-2">
      <h2 className="text-xl mb-2">Currency Converter</h2>
      <label className="flex flex-col">
        Amount
        <input
          className="text-black p-1 rounded"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col">
          Base
          <select
            className="text-black p-1 rounded"
            value={base}
            onChange={(e) => setBase(e.target.value)}
          >
            {currencyOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          Quote
          <select
            className="text-black p-1 rounded"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
          >
            {currencyOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div data-testid="currency-result" className="mt-2">
        {result && `${amount} ${base} = ${result} ${quote}`}
      </div>
      {lastUpdated && (
        <div className="text-xs">Last updated: {new Date(lastUpdated).toLocaleString()}</div>
      )}
    </div>
  );
};

export default CurrencyConverter;

