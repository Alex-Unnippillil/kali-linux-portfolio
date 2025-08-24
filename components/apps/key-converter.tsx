import React, { useState } from 'react';
import {
  importJWK,
  importPKCS8,
  importSPKI,
  exportJWK,
  exportPKCS8,
  exportSPKI,
  calculateJwkThumbprint,
} from 'jose';

const formats = [
  { label: 'PEM', value: 'pem' },
  { label: 'DER (base64)', value: 'der' },
  { label: 'JWK', value: 'jwk' },
];

const algorithms = [
  'RS256',
  'RS384',
  'RS512',
  'PS256',
  'PS384',
  'PS512',
  'ES256',
  'ES384',
  'ES512',
  'EdDSA',
];

function b64UrlToUint8Array(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  const b64 = s + '='.repeat(pad);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function tryImportJwk(jwk: any): Promise<CryptoKey> {
  if (jwk.alg) {
    return (await importJWK(jwk, jwk.alg)) as CryptoKey;
  }
  for (const alg of algorithms) {
    try {
      return (await importJWK(jwk, alg)) as CryptoKey;
    } catch {
      continue;
    }
  }
  throw new Error('Unsupported JWK');
}

async function tryImportPem(pem: string): Promise<CryptoKey> {
  for (const alg of algorithms) {
    try {
      return (await importPKCS8(pem, alg)) as CryptoKey;
    } catch {}
    try {
      return (await importSPKI(pem, alg)) as CryptoKey;
    } catch {}
  }
  throw new Error('Unsupported PEM/DER key');
}

const KeyConverter: React.FC = () => {
  const [inputFormat, setInputFormat] = useState('pem');
  const [outputFormat, setOutputFormat] = useState('jwk');

  const [key, setKey] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [thumbprint, setThumbprint] = useState('');
  const [warning, setWarning] = useState('');

  const convert = async () => {
    try {
      setError('');
      setWarning('');
      setThumbprint('');
      let cryptoKey: CryptoKey;
      if (inputFormat === 'jwk') {
        cryptoKey = await tryImportJwk(JSON.parse(key));
      } else if (inputFormat === 'pem') {
        cryptoKey = await tryImportPem(key);

      } else {
        const b64 = key.replace(/\s+/g, '');
        const body = b64.match(/.{1,64}/g)?.join('\n') || '';
        const pkcs8Pem = `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`;
        const spkiPem = `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`;
        try {
          cryptoKey = await tryImportPem(pkcs8Pem);
        } catch {
          cryptoKey = await tryImportPem(spkiPem);
        }
      }

      const jwk = await exportJWK(cryptoKey);
      setThumbprint(await calculateJwkThumbprint(jwk));

      let warn = '';
      if (jwk.kty === 'RSA' && jwk.n) {
        const bits = b64UrlToUint8Array(jwk.n).length * 8;
        if (bits < 2048) {
          warn = `Warning: RSA key is only ${bits} bits`;
        }
      } else if (jwk.kty === 'EC' && jwk.crv) {
        const match = jwk.crv.match(/\d+/);
        if (match && parseInt(match[0], 10) < 256) {
          warn = `Warning: EC curve ${jwk.crv} is weak`;

        }
      }
      setWarning(warn);

      if (outputFormat === 'jwk') {

        setResult(JSON.stringify(jwk, null, 2));
      } else if (outputFormat === 'pem') {
        if ('d' in jwk) {
          setResult(await exportPKCS8(cryptoKey));
        } else {
          setResult(await exportSPKI(cryptoKey));
        }
      } else {
        let pem: string;
        if ('d' in jwk) {
          pem = await exportPKCS8(cryptoKey);
        } else {
          pem = await exportSPKI(cryptoKey);
        }
        const b64 = pem.replace(/-----(BEGIN|END)[^\n]+-----/g, '').replace(/\s+/g, '');
        setResult(b64);
      }
    } catch (e: unknown) {
      let errorMsg = 'Unknown error';
      if (typeof e === 'object' && e !== null && 'message' in e && typeof (e as any).message === 'string') {
        errorMsg = (e as any).message;
      }
      setError(errorMsg);
      setResult('');
      setThumbprint('');
      setWarning('');
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
      {thumbprint && (
        <div>
          <strong>Thumbprint:</strong> {thumbprint}
        </div>
      )}
      {warning && <div className="text-yellow-400">{warning}</div>}
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
};

export default KeyConverter;
export const displayKeyConverter = () => <KeyConverter />;

