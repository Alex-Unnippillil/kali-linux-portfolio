import React, { useState, useEffect } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

const CurrencyConverter = () => {
  const [rates, setRates] = useState({});
  const [from, setFrom] = usePersistentState('currency-from', 'USD');
  const [to, setTo] = usePersistentState('currency-to', 'EUR');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState('');
  const [amountError, setAmountError] = useState('');
  const [fromError, setFromError] = useState('');
  const [toError, setToError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then((res) => res.json())
      .then((data) => setRates(data.rates || {}))
      .catch(() => setRates({}));
  }, []);

  useEffect(() => {
    if (
      !amount ||
      isNaN(parseFloat(amount)) ||
      amountError ||
      fromError ||
      toError ||
      !rates[from] ||
      !rates[to]
    ) {
      setResult('');
      return;
    }
    const usdAmount = parseFloat(amount) / rates[from];
    const converted = usdAmount * rates[to];
    setResult(converted.toFixed(2));
  }, [amount, from, to, rates, amountError, fromError, toError]);

  const currencyOptions = Object.keys(rates);

  const handleAmountChange = (e) => {
    const val = e.target.value;
    setAmount(val);
    setAmountError(val === '' || isNaN(Number(val)) ? 'Enter a valid number' : '');
  };

  const handleFromChange = (e) => {
    const val = e.target.value.toUpperCase();
    setFrom(val);
    setFromError(currencyOptions.includes(val) ? '' : 'Invalid currency');
  };

  const handleToChange = (e) => {
    const val = e.target.value.toUpperCase();
    setTo(val);
    setToError(currencyOptions.includes(val) ? '' : 'Invalid currency');
  };

  const resultText = result ? `${amount} ${from} = ${result} ${to}` : '';

  const copyResult = async () => {
    if (!resultText) return;
    try {
      if (navigator && navigator.clipboard) {
        await navigator.clipboard.writeText(resultText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="bg-gray-700 p-4 rounded flex flex-col gap-2">
      <h2 className="text-xl mb-2">Currency Converter</h2>
      <label className="flex flex-col">
        Amount
        <input
          className="text-black p-1 rounded"
          type="text"
          value={amount}
          onChange={handleAmountChange}
        />
        {amountError && (
          <span className="text-red-500 text-sm">{amountError}</span>
        )}
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col">
          From
          <input
            className="text-black p-1 rounded"
            list="currency-from-options"
            value={from}
            onChange={handleFromChange}
          />
          <datalist id="currency-from-options">
            {currencyOptions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {fromError && (
            <span className="text-red-500 text-sm">{fromError}</span>
          )}
        </label>
        <label className="flex flex-col">
          To
          <input
            className="text-black p-1 rounded"
            list="currency-to-options"
            value={to}
            onChange={handleToChange}
          />
          <datalist id="currency-to-options">
            {currencyOptions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {toError && <span className="text-red-500 text-sm">{toError}</span>}
        </label>
      </div>
      <div data-testid="currency-result" className="mt-2 flex items-center gap-2">
        {result && (
          <>
            <span>{resultText}</span>
            <button
              className="bg-gray-600 px-2 py-1 rounded"
              onClick={copyResult}
            >
              Copy
            </button>
            {copied && (
              <span className="text-green-400 text-sm">Copied!</span>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CurrencyConverter;

