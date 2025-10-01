import React, { useState, useEffect } from 'react';

import HistoryLineChart from './charts/HistoryLineChart';

const apiBase = process.env.NEXT_PUBLIC_CURRENCY_API_URL || 'https://api.exchangerate.host/latest';
const isDemo = !process.env.NEXT_PUBLIC_CURRENCY_API_URL;

const CurrencyConverter = () => {
  const [rates, setRates] = useState({});
  const [base, setBase] = useState('USD');
  const [quote, setQuote] = useState('EUR');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const cacheKey = `currencyRates_${base}`;
    const historyKey = `currencyHistory_${base}`;
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
    fetch(`${apiBase}?base=${base}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.rates) {
          setRates(data.rates);
          const ts = new Date().toISOString();
          setLastUpdated(ts);
          if (typeof window !== 'undefined') {
            localStorage.setItem(cacheKey, JSON.stringify({ rates: data.rates, timestamp: ts }));
            try {
              const raw = localStorage.getItem(historyKey);
              const arr = raw ? JSON.parse(raw) : [];
              arr.push({ timestamp: ts, rates: data.rates });
              localStorage.setItem(historyKey, JSON.stringify(arr.slice(-30)));
            } catch {
              /* ignore */
            }
          }
        }
      })
      .catch(() => {});
  }, [base]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const historyKey = `currencyHistory_${base}`;
    try {
      const raw = localStorage.getItem(historyKey);
      const arr = raw ? JSON.parse(raw) : [];
      const mapped = arr
        .map(({ timestamp, rates }) => ({ timestamp, rate: rates[quote] }))
        .filter((p) => typeof p.rate === 'number');
      setHistory(mapped);
    } catch {
      setHistory([]);
    }
  }, [base, quote, lastUpdated]);

  useEffect(() => {
    if (!amount || !rates[quote]) {
      setResult('');
      return;
    }
    const converted = parseFloat(amount) * rates[quote];
    const formatted = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: quote,
    }).format(converted);
    setResult(formatted);
  }, [amount, quote, rates]);

  const currencyOptions = [base, ...Object.keys(rates)].sort();

  const formatAmount = (val, curr) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: curr }).format(val);

  return (
    <div className="bg-gray-700 p-4 rounded flex flex-col gap-2">
      <h2 className="text-xl mb-2">Currency Converter</h2>
      {isDemo && <div className="text-xs text-yellow-300">Demo rates</div>}
      <label className="flex flex-col">
        Amount
        <input
          className="text-black p-1 rounded"
          type="number"
          aria-label="Amount"
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
        {result && `${formatAmount(amount, base)} = ${result}`}
      </div>
      {lastUpdated && (
        <div className="text-xs">Last updated: {new Date(lastUpdated).toLocaleString()}</div>
      )}
      {history.length > 1 ? (
        <HistoryLineChart history={history} />
      ) : (
        <div className="mt-2 text-xs text-slate-200">Insufficient history to plot</div>
      )}
    </div>
  );
};

export default CurrencyConverter;

