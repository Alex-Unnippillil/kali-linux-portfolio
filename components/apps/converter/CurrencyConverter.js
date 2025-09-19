import React, { useState, useEffect, useMemo } from 'react';
import { useIntl } from '../../../lib/i18n/intl';
import { messageIds } from '../../../lib/i18n/messages';

const apiBase = process.env.NEXT_PUBLIC_CURRENCY_API_URL || 'https://api.exchangerate.host/latest';
const isDemo = !process.env.NEXT_PUBLIC_CURRENCY_API_URL;

const CurrencyConverter = () => {
  const [rates, setRates] = useState({});
  const [base, setBase] = useState('USD');
  const [quote, setQuote] = useState('EUR');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState(null);
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

  const intl = useIntl();

  useEffect(() => {
    if (!amount || !rates[quote]) {
      setResult(null);
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount)) {
      setResult(null);
      return;
    }
    const converted = parsedAmount * rates[quote];
    setResult({ base: parsedAmount, converted });
  }, [amount, quote, rates]);

  const currencyOptions = [base, ...Object.keys(rates)].sort();

  const chartPoints = useMemo(() => {
    if (history.length < 2) return '';
    const max = Math.max(...history.map((h) => h.rate));
    const min = Math.min(...history.map((h) => h.rate));
    return history
      .map((h, i) => {
        const x = (i / (history.length - 1)) * 100;
        const y = 100 - ((h.rate - min) / ((max - min) || 1)) * 100;
        return `${x},${y}`;
      })
      .join(' ');
  }, [history]);

  return (
    <div className="bg-gray-700 p-4 rounded flex flex-col gap-2">
      <h2 className="text-xl mb-2">
        {intl.formatMessage({ id: messageIds.currencyConverter.title })}
      </h2>
      {isDemo && (
        <div className="text-xs text-yellow-300">
          {intl.formatMessage({ id: messageIds.currencyConverter.demoNotice })}
        </div>
      )}
      <label className="flex flex-col">
        {intl.formatMessage({ id: messageIds.currencyConverter.amountLabel })}
        <input
          className="text-black p-1 rounded"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col">
          {intl.formatMessage({ id: messageIds.currencyConverter.baseLabel })}
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
          {intl.formatMessage({ id: messageIds.currencyConverter.quoteLabel })}
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
        {result &&
          intl.formatMessage(
            { id: messageIds.currencyConverter.result },
            {
              baseAmount: intl.formatNumber(result.base, {
                style: 'currency',
                currency: base,
              }),
              quoteAmount: intl.formatNumber(result.converted, {
                style: 'currency',
                currency: quote,
              }),
            },
          )}
      </div>
      {lastUpdated && (
        <div className="text-xs">
          {intl.formatMessage(
            { id: messageIds.currencyConverter.lastUpdated },
            { timestamp: new Date(lastUpdated) },
          )}
        </div>
      )}
      <div className="text-xs" data-testid="history-count">
        {intl.formatMessage(
          { id: messageIds.currencyConverter.historyCount },
          { count: history.length },
        )}
      </div>
      {chartPoints && (
        <svg
          className="mt-2"
          width="100%"
          height="100"
          role="img"
          aria-label={intl.formatMessage({ id: messageIds.currencyConverter.chartLabel })}
        >
          <polyline
            fill="none"
            stroke="#4ade80"
            strokeWidth="2"
            points={chartPoints}
          />
        </svg>
      )}
    </div>
  );
};

export default CurrencyConverter;

