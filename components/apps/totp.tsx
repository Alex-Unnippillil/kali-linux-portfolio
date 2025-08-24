import React, { useEffect, useState } from 'react';
import { totp } from 'otplib';

type HashAlg = 'SHA1' | 'SHA256' | 'SHA512';

const base32Regex = /^[A-Z2-7]+=*$/;

const parseOtpauth = (uri: string) => {
  try {
    const url = new URL(uri);
    if (url.protocol !== 'otpauth:' || url.host !== 'totp') return null;
    const params = url.searchParams;
    const secret = params.get('secret')?.replace(/\s+/g, '').toUpperCase() || '';
    const period = Number(params.get('period') || params.get('step') || '30');
    const digits = Number(params.get('digits') || '6');
    const algorithm = (params.get('algorithm') || 'SHA1').toUpperCase() as HashAlg;
    return { secret, period, digits, algorithm };
  } catch {
    return null;
  }
};

const isValidSecret = (s: string) => base32Regex.test(s) && s.length >= 16;

const TOTPApp = () => {
  const [uri, setUri] = useState('');
  const [secret, setSecret] = useState('');
  const [period, setPeriod] = useState(30);
  const [digits, setDigits] = useState(6);
  const [algorithm, setAlgorithm] = useState<HashAlg>('SHA1');
  const [code, setCode] = useState('');
  const [prevCode, setPrevCode] = useState('');
  const [nextCode, setNextCode] = useState('');
  const [remaining, setRemaining] = useState(totp.timeRemaining());
  const secretValid = isValidSecret(secret);

  const handleUriChange = (value: string) => {
    setUri(value);
    const cfg = parseOtpauth(value);
    if (cfg) {
      setSecret(cfg.secret);
      setPeriod(cfg.period);
      setDigits(cfg.digits);
      setAlgorithm(cfg.algorithm);
    }
  };

  const handleSecretChange = (value: string) => {
    const cleaned = value.replace(/\s+/g, '').toUpperCase();
    setSecret(cleaned);
  };

  useEffect(() => {
    totp.options = { step: period, digits, algorithm: algorithm as any };
    const update = () => {
      if (secretValid) {
        const now = Date.now();
        setCode(totp.generate(secret));
        setPrevCode(totp.generate(secret, { epoch: now - period * 1000 }));
        setNextCode(totp.generate(secret, { epoch: now + period * 1000 }));
      } else {
        setCode('');
        setPrevCode('');
        setNextCode('');
      }
      setRemaining(totp.timeRemaining());
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [secret, period, digits, algorithm, secretValid]);

  const percentage = ((period - remaining) / period) * 100;
  const color = `hsl(${(remaining / period) * 120}, 100%, 50%)`;

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <div className="space-y-2">
        <label className="block">
          otpauth URI
          <input
            value={uri}
            onChange={(e) => handleUriChange(e.target.value)}
            className="w-full p-2 rounded text-black"
          />
        </label>
        <label className="block">
          Secret
          <input
            value={secret}
            onChange={(e) => handleSecretChange(e.target.value)}
            className="w-full p-2 rounded text-black"
          />
          {!secretValid && secret && (
            <div className="text-red-400 text-sm mt-1">
              Secret must be Base32 (A-Z2-7) and at least 16 chars
            </div>
          )}
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
        <div className="text-6xl font-mono" style={{ color }}>
          {code || '------'}
        </div>
        {code && (
          <button
            className="mt-2 px-3 py-1 bg-gray-700 rounded"
            onClick={() => navigator.clipboard.writeText(code)}
          >
            Copy
          </button>
        )}
        <div className="h-2 bg-gray-700 mt-4">
          <div
            className="h-full"
            style={{ width: `${percentage}%`, backgroundColor: color }}
          />
        </div>
        <div className="flex justify-around mt-4 text-sm font-mono">
          <div>Prev: {prevCode || '------'}</div>
          <div>Next: {nextCode || '------'}</div>
        </div>
        <div className="mt-1 text-sm">Refreshing in {remaining}s</div>
      </div>
    </div>
  );
};

export default TOTPApp;
export const displayTotp = () => <TOTPApp />;
