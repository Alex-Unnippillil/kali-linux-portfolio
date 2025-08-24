import React, { useEffect, useRef, useState } from 'react';
import { totp } from 'otplib';
import QRCode from 'qrcode';

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
    const label = decodeURIComponent(url.pathname.slice(1));
    let issuer = params.get('issuer') || '';
    if (label.includes(':')) {
      const [maybeIssuer] = label.split(':');
      if (!issuer) issuer = maybeIssuer;
    }
    return { secret, period, digits, algorithm, label, issuer };
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
  const [label, setLabel] = useState('');
  const [issuer, setIssuer] = useState('');
  const [tolerance, setTolerance] = useState(1);
  const [drift, setDrift] = useState(0);
  const [codes, setCodes] = useState<string[]>([]);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [remaining, setRemaining] = useState(totp.timeRemaining());
  const qrRef = useRef<HTMLCanvasElement>(null);
  const secretValid = isValidSecret(secret);

  const handleUriChange = (value: string) => {
    setUri(value);
    const cfg = parseOtpauth(value);
    if (cfg) {
      setSecret(cfg.secret);
      setPeriod(cfg.period);
      setDigits(cfg.digits);
      setAlgorithm(cfg.algorithm);
      setLabel(cfg.label);
      setIssuer(cfg.issuer);
    }
  };

  const handleSecretChange = (value: string) => {
    const cleaned = value.replace(/\s+/g, '').toUpperCase();
    setSecret(cleaned);
  };

  const buildUri = () => {
    if (!secretValid) return '';
    const name = label || '';
    const path = issuer ? `${issuer}:${name}` : name;
    const url = new URL(`otpauth://totp/${encodeURIComponent(path)}`);
    url.searchParams.set('secret', secret);
    url.searchParams.set('period', String(period));
    url.searchParams.set('digits', String(digits));
    url.searchParams.set('algorithm', algorithm);
    if (issuer) url.searchParams.set('issuer', issuer);
    return url.toString();
  };

  const generateRecoveryCodes = () => {
    const codes = Array.from({ length: 10 }, () => {
      const bytes = new Uint8Array(8);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => (b % 10).toString())
        .join('')
        .replace(/(\d{4})(?=\d)/g, '$1-');
    });
    setRecoveryCodes(codes);
  };

  const exportRecoveryCodes = () => {
    const blob = new Blob([recoveryCodes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
    setRecoveryCodes([]);
  };

  useEffect(() => {
    totp.options = { step: period, digits, algorithm: algorithm as any };
    const update = () => {
      if (secretValid) {
        const now = Date.now() + drift * 1000;
        const arr: string[] = [];
        for (let w = -tolerance; w <= tolerance; w++) {
          arr.push((totp as any).generate(secret, { epoch: now + w * period * 1000 }));
        }
        setCodes(arr);
        const rem = period - Math.floor((Math.floor(now / 1000)) % period);
        setRemaining(rem === period ? 0 : rem);
      } else {
        setCodes([]);
        setRemaining(period);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [secret, period, digits, algorithm, secretValid, tolerance, drift]);

  const provisioningUri = buildUri();

  useEffect(() => {
    if (provisioningUri && qrRef.current) {
      QRCode.toCanvas(qrRef.current, provisioningUri).catch(() => {});
    }
  }, [provisioningUri]);

  const percentage = ((period - remaining) / period) * 100;
  const color = `hsl(${(remaining / period) * 120}, 100%, 50%)`;
  const currentCode = codes[tolerance] || '';

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
          Label
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full p-2 rounded text-black"
          />
        </label>
        <label className="block">
          Issuer
          <input
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
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
        <label className="block">
          Tolerance
          <input
            type="number"
            value={tolerance}
            onChange={(e) => setTolerance(Number(e.target.value))}
            className="w-full p-2 rounded text-black"
          />
        </label>
        <label className="block">
          Time Drift (s)
          <input
            type="number"
            value={drift}
            onChange={(e) => setDrift(Number(e.target.value))}
            className="w-full p-2 rounded text-black"
          />
        </label>
        {provisioningUri && (
          <div className="block">
            <label>Provisioning URI</label>
            <input
              value={provisioningUri}
              readOnly
              className="w-full p-2 rounded text-black"
            />
            <canvas ref={qrRef} className="mx-auto mt-2 bg-white p-2 rounded" />
          </div>
        )}
      </div>
      <div className="mt-6 text-center">
        <div className="text-6xl font-mono" style={{ color }}>
          {currentCode || '------'}
        </div>
        {currentCode && (
          <button
            className="mt-2 px-3 py-1 bg-gray-700 rounded"
            onClick={() => navigator.clipboard.writeText(currentCode)}
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
        <div className="flex justify-around mt-4 text-sm font-mono flex-wrap">
          {codes.map((c, idx) => {
            const offset = idx - tolerance;
            if (offset === 0) return null;
            const lbl = offset < 0 ? `Prev ${Math.abs(offset)}` : `Next ${offset}`;
            return <div key={idx}>{lbl}: {c}</div>;
          })}
        </div>
        <div className="mt-1 text-sm">Refreshing in {remaining}s</div>
        <div className="mt-6 space-y-2">
          <button
            className="px-3 py-1 bg-gray-700 rounded"
            onClick={generateRecoveryCodes}
          >
            Generate Recovery Codes
          </button>
          {recoveryCodes.length > 0 && (
            <div className="space-y-2">
              <ul className="font-mono text-sm">
                {recoveryCodes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
              <button
                className="px-3 py-1 bg-gray-700 rounded"
                onClick={exportRecoveryCodes}
              >
                Export
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TOTPApp;
export const displayTotp = () => <TOTPApp />;
