import React, { useEffect, useState } from 'react';
import { totp } from 'otplib';

type HashAlg = 'SHA1' | 'SHA256' | 'SHA512';

const TOTPApp = () => {
  const [secret, setSecret] = useState('');
  const [period, setPeriod] = useState(30);
  const [digits, setDigits] = useState(6);
  const [algorithm, setAlgorithm] = useState<HashAlg>('SHA1');
  const [code, setCode] = useState('');
  const [remaining, setRemaining] = useState(totp.timeRemaining());

  useEffect(() => {
    totp.options = { step: period, digits, algorithm: algorithm as any };
    const update = () => {
      setCode(secret ? totp.generate(secret) : '');
      setRemaining(totp.timeRemaining());
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [secret, period, digits, algorithm]);

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <div className="space-y-2">
        <label className="block">
          Secret
          <input
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="w-full p-2 rounded text-black"
          />
        </label>
        <label className="block">
          Period
          <input
            type="number"
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="w-full p-2 rounded text-black"
          />
        </label>
        <label className="block">
          Digits
          <input
            type="number"
            value={digits}
            onChange={(e) => setDigits(Number(e.target.value))}
            className="w-full p-2 rounded text-black"
          />
        </label>
        <label className="block">
          Algorithm
          <select
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value as HashAlg)}
            className="w-full p-2 rounded text-black"
          >
            <option value="SHA1">SHA1</option>
            <option value="SHA256">SHA256</option>
            <option value="SHA512">SHA512</option>
          </select>
        </label>
      </div>
      <div className="mt-6 text-center">
        <div className="text-4xl font-mono">{code || '------'}</div>
        <div className="mt-1 text-sm">Refreshing in {remaining}s</div>
      </div>
    </div>
  );
};

export default TOTPApp;
export const displayTotp = () => <TOTPApp />;
