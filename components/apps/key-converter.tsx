import React, { useState } from 'react';
import {
  importJWK,
  importPKCS8,
  importSPKI,
  exportJWK,
  exportPKCS8,
  exportSPKI,
} from 'jose';

const formats = [
  { label: 'PEM', value: 'pem' },
  { label: 'DER (base64)', value: 'der' },
  { label: 'JWK', value: 'jwk' },
];

const KeyConverter: React.FC = () => {
  const [inputFormat, setInputFormat] = useState('pem');
  const [outputFormat, setOutputFormat] = useState('jwk');
  const [alg, setAlg] = useState('RS256');
  const [curve, setCurve] = useState('P-256');
  const [key, setKey] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const convert = async () => {
    try {
      setError('');
      const algMap: Record<string, string> = {
        'P-256': 'ES256',
        'P-384': 'ES384',
        'P-521': 'ES512',
        Ed25519: 'EdDSA',
      };
      const effectiveAlg = alg.startsWith('ES') || alg === 'EdDSA' ? algMap[curve] || alg : alg;

      let cryptoKey: CryptoKey;
      if (inputFormat === 'jwk') {
        const jwk = JSON.parse(key);
        if (!jwk.alg) jwk.alg = effectiveAlg;
        if (effectiveAlg === 'EdDSA' || effectiveAlg.startsWith('ES')) jwk.crv = jwk.crv || curve;
        cryptoKey = (await importJWK(jwk, effectiveAlg)) as CryptoKey;
      } else if (inputFormat === 'pem') {
        try {
          cryptoKey = (await importPKCS8(key, effectiveAlg)) as CryptoKey;
        } catch {
          cryptoKey = (await importSPKI(key, effectiveAlg)) as CryptoKey;
        }
      } else {
        const b64 = key.replace(/\s+/g, '');
        const body = b64.match(/.{1,64}/g)?.join('\n') || '';
        const pkcs8Pem = `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`;
        const spkiPem = `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`;
        try {
          cryptoKey = (await importPKCS8(pkcs8Pem, effectiveAlg)) as CryptoKey;
        } catch {
          cryptoKey = (await importSPKI(spkiPem, effectiveAlg)) as CryptoKey;
        }
      }

      if (outputFormat === 'jwk') {
        const jwk = await exportJWK(cryptoKey);
        if (effectiveAlg === 'EdDSA' || effectiveAlg.startsWith('ES')) {
          jwk.alg = effectiveAlg;
          jwk.crv = curve;
        }
        setResult(JSON.stringify(jwk, null, 2));
      } else if (outputFormat === 'pem') {
        try {
          const pem = await exportPKCS8(cryptoKey);
          setResult(pem);
        } catch {
          const pem = await exportSPKI(cryptoKey);
          setResult(pem);
        }
      } else {
        try {
          const pem = await exportSPKI(cryptoKey);
          const b64 = pem.replace(/-----(BEGIN|END)[^\n]+-----/g, '').replace(/\s+/g, '');
          setResult(b64);
        } catch {
          const pem = await exportPKCS8(cryptoKey);
          const b64 = pem.replace(/-----(BEGIN|END)[^\n]+-----/g, '').replace(/\s+/g, '');
          setResult(b64);
        }
      }
    } catch (e: unknown) {
      let errorMsg = 'Unknown error';
      if (typeof e === 'object' && e !== null && 'message' in e && typeof (e as any).message === 'string') {
        errorMsg = (e as any).message;
      }
      setError(errorMsg);
      setResult('');
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
  };

  return (
    <div className="h-full w-full p-4 bg-panel text-white flex flex-col space-y-2">
      <div className="flex flex-wrap gap-2">
        <select
          value={inputFormat}
          onChange={(e) => setInputFormat(e.target.value)}
          className="px-2 py-1 text-black rounded"
        >
          {formats.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={outputFormat}
          onChange={(e) => setOutputFormat(e.target.value)}
          className="px-2 py-1 text-black rounded"
        >
        {formats.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
        </select>
        {(alg.startsWith('ES') || alg === 'EdDSA') && (
          <select
            value={curve}
            onChange={(e) => setCurve(e.target.value)}
            className="px-2 py-1 text-black rounded"
          >
            <option value="P-256">P-256</option>
            <option value="P-384">P-384</option>
            <option value="P-521">P-521</option>
            <option value="Ed25519">Ed25519</option>
          </select>
        )}
        <input
          value={alg}
          onChange={(e) => setAlg(e.target.value)}
          className="px-2 py-1 text-black rounded"
          placeholder="Algorithm"
        />
        <button onClick={convert} className="px-3 py-1 bg-blue-600 rounded">
          Convert
        </button>
        {result && (
          <button onClick={copy} className="px-3 py-1 bg-green-600 rounded">
            Copy
          </button>
        )}
      </div>
      <textarea
        value={key}
        onChange={(e) => setKey(e.target.value)}
        className="flex-1 text-black p-2 rounded"
        placeholder="Key material"
      />
      <textarea
        value={result}
        readOnly
        className="flex-1 text-black p-2 rounded"
        placeholder="Result"
      />
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
};

export default KeyConverter;
export const displayKeyConverter = () => <KeyConverter />;

