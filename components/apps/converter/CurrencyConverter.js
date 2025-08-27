import React, { useState, useEffect } from 'react';

const CurrencyConverter = () => {
  const [rates, setRates] = useState({});
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('EUR');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [favorites, setFavorites] = useState([]);

  // Load cached rates and favorites, then fetch latest rates
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const cached = JSON.parse(localStorage.getItem('currencyRates'));
      if (cached?.rates) {
        setRates(cached.rates);
        setLastUpdated(cached.timestamp);
      }
    } catch {
      /* empty */
    }

    try {
      const favs = JSON.parse(localStorage.getItem('currencyFavorites'));
      if (Array.isArray(favs)) setFavorites(favs);
    } catch {
      /* empty */
    }

    async function fetchRates() {
      try {
        const res = await fetch(
          'https://api.exchangerate.host/latest?base=USD'
        );
        const data = await res.json();
        if (data?.rates) {
          setRates(data.rates);
          const ts = new Date().toISOString();
          setLastUpdated(ts);
          localStorage.setItem(
            'currencyRates',
            JSON.stringify({ rates: data.rates, timestamp: ts })
          );
        }
      } catch {
        /* empty */
      }
    }

    fetchRates();
  }, []);

  // Convert when inputs change
  useEffect(() => {
    if (!amount || !rates[from] || !rates[to]) {
      setResult('');
      return;
    }
    const usdAmount = parseFloat(amount) / rates[from];
    const converted = usdAmount * rates[to];
    setResult(converted.toFixed(2));
  }, [amount, from, to, rates]);

  const currencyOptions = Object.keys(rates);

  const handleSwap = () => {
    const newFrom = to;
    const newTo = from;
    const newAmount = result || amount;
    let newResult = '';
    if (newAmount && rates[newFrom] && rates[newTo]) {
      const usdAmount = parseFloat(newAmount) / rates[newFrom];
      newResult = (usdAmount * rates[newTo]).toFixed(2);
    }
    setFrom(newFrom);
    setTo(newTo);
    setAmount(newAmount);
    setResult(newResult);
  };

  const addFavorite = () => {
    const pair = { from, to };
    if (favorites.some((f) => f.from === from && f.to === to)) return;
    const updated = [...favorites, pair];
    setFavorites(updated);
    localStorage.setItem('currencyFavorites', JSON.stringify(updated));
  };

  const removeFavorite = (idx) => {
    const updated = favorites.filter((_, i) => i !== idx);
    setFavorites(updated);
    localStorage.setItem('currencyFavorites', JSON.stringify(updated));
  };

  const selectFavorite = (pair) => {
    setFrom(pair.from);
    setTo(pair.to);
  };

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
          From
          <select
            className="text-black p-1 rounded"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          >
            {currencyOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          To
          <select
            className="text-black p-1 rounded"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          >
            {currencyOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        onClick={handleSwap}
        className="mt-1 px-2 py-1 bg-gray-600 rounded"
        aria-label="Swap currencies"
      >
        Swap
      </button>
      <div data-testid="currency-result" className="mt-2">
        {result && `${amount} ${from} = ${result} ${to}`}
      </div>
      {lastUpdated && (
        <div className="text-xs">Rates updated: {new Date(lastUpdated).toLocaleString()}</div>
      )}
      <button
        onClick={addFavorite}
        className="mt-2 px-2 py-1 bg-gray-600 rounded"
      >
        Add Favorite
      </button>
      {favorites.length > 0 && (
        <div className="mt-2">
          <h3 className="text-lg">Favorites</h3>
          <ul className="flex flex-wrap gap-2 mt-1">
            {favorites.map((fav, idx) => (
              <li key={`${fav.from}-${fav.to}-${idx}`} className="flex items-center">
                <button
                  className="px-2 py-1 bg-gray-600 rounded"
                  onClick={() => selectFavorite(fav)}
                >
                  {fav.from} → {fav.to}
                </button>
                <button
                  className="ml-1 text-xs"
                  onClick={() => removeFavorite(idx)}
                  aria-label={`Remove ${fav.from} to ${fav.to}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CurrencyConverter;

