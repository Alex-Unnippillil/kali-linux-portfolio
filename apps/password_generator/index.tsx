import React, { useEffect, useState } from 'react';
import { logEvent } from '../../utils/analytics';

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+~`|}{[]:;?><,./-=';

const PasswordGenerator: React.FC = () => {
  const [length, setLength] = useState(12);
  const [useLower, setUseLower] = useState(true);
  const [useUpper, setUseUpper] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    logEvent('app_open', { id: 'password_generator' });
  }, []);

  const generatePassword = () => {
    logEvent('app_action', { id: 'password_generator', action: 'generate' });
    let chars = '';
    if (useLower) chars += LOWER;
    if (useUpper) chars += UPPER;
    if (useNumbers) chars += NUMS;
    if (useSymbols) chars += SYMBOLS;
    if (!chars) {
      setPassword('');
      return;
    }
    let pwd = '';
    for (let i = 0; i < length; i += 1) {
      const idx = Math.floor(Math.random() * chars.length);
      pwd += chars[idx];
    }
    setPassword(pwd);
  };

  const copyToClipboard = async () => {
    if (!password) return;
    try {
      await navigator.clipboard?.writeText(password);
      logEvent('app_action', { id: 'password_generator', action: 'copy' });
    } catch (e) {
      // ignore
    }
  };

  const strengthInfo = () => {
    const types = [useLower, useUpper, useNumbers, useSymbols].filter(Boolean).length;
    let score = 0;
    if (length >= 8) score += 1;
    if (length >= 12) score += 1;
    score += types - 1; // 0-3
    if (score <= 1) return { label: 'Weak', width: '33%', color: 'bg-red-500' };
    if (score === 2) return { label: 'Medium', width: '66%', color: 'bg-yellow-500' };
    return { label: 'Strong', width: '100%', color: 'bg-green-500' };
  };

  const { label, width, color } = strengthInfo();

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <div>
        <label htmlFor="length" className="mr-2">Length:</label>
        <input
          id="length"
          type="number"
          min={4}
          max={64}
          value={length}
          onChange={(e) => setLength(parseInt(e.target.value, 10) || 0)}
          className="text-black px-2"
        />
      </div>
      <div className="flex flex-col space-y-1">
        <label><input type="checkbox" checked={useLower} onChange={(e) => setUseLower(e.target.checked)} /> Lowercase</label>
        <label><input type="checkbox" checked={useUpper} onChange={(e) => setUseUpper(e.target.checked)} /> Uppercase</label>
        <label><input type="checkbox" checked={useNumbers} onChange={(e) => setUseNumbers(e.target.checked)} /> Numbers</label>
        <label><input type="checkbox" checked={useSymbols} onChange={(e) => setUseSymbols(e.target.checked)} /> Symbols</label>
      </div>
      <div className="flex space-x-2 items-center">
        <input
          data-testid="password-display"
          type="text"
          readOnly
          value={password}
          className="flex-1 text-black px-2 py-1"
        />
        <button
          type="button"
          onClick={copyToClipboard}
          className="px-3 py-1 bg-blue-600 rounded"
        >
          Copy
        </button>
      </div>
      <div>
        <div className="h-2 w-full bg-gray-700 rounded">
          <div className={`h-full ${color} rounded`} style={{ width }} />
        </div>
        <div className="text-sm mt-1">Strength: {label}</div>
      </div>
      <div className="mt-auto">
        <button
          type="button"
          onClick={generatePassword}
          className="w-full px-4 py-2 bg-green-600 rounded"
        >
          Generate
        </button>
      </div>
    </div>
  );
};

export default PasswordGenerator;
