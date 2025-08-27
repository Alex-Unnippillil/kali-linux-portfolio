import React, { useState, useEffect } from 'react';

const CurrencyConverter = () => {
  const [rates, setRates] = useState({});
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('EUR');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState('');

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then((res) => res.json())
      .then((data) => setRates(data.rates || {}))
      .catch(() => setRates({}));
  }, []);

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

  return (
    <div className="bg-gray-700 p-4 rounded flex flex-col gap-2">
      <h2 className="text-xl mb-2">Currency Converter</h2>
      <label className="flex flex-col">
        Amount
        <input
          className="text-black p-1 rounded"
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-2 items-end">
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
        data-testid="currency-swap"
        className="bg-gray-600 p-1 rounded"
        onClick={() => {
          setFrom(to);
          setTo(from);
        }}
      >
        Swap
      </button>
      {result && (
        <div className="mt-2 flex items-center gap-2">
          <span data-testid="currency-result">
            {`${amount} ${from} = ${result} ${to}`}
          </span>
          <button
            data-testid="currency-copy"
            className="bg-gray-600 px-2 py-1 rounded"
            onClick={() =>
              navigator.clipboard?.writeText(
                `${result}`
              )
            }
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
};

export default CurrencyConverter;

