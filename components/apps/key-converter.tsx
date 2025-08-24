import React, { useState } from 'react';
import {
  importJWK,
  importPKCS8,
  importSPKI,
  importX509,
  exportJWK,
  exportPKCS8,
  exportSPKI,
  calculateJwkThumbprint,
} from 'jose';

const allowedEcCurves = ['P-256', 'P-384', 'P-521', 'secp256k1'];
const allowedOkpCurves = ['Ed25519', 'Ed448', 'X25519', 'X448'];

function validateKey(jwk: any) {
  if (jwk.kty === 'EC' && jwk.crv && !allowedEcCurves.includes(jwk.crv)) {
    throw new Error(`Unsupported curve: ${jwk.crv}`);
  }
  if (jwk.kty === 'OKP' && jwk.crv && !allowedOkpCurves.includes(jwk.crv)) {
    throw new Error(`Unsupported curve: ${jwk.crv}`);
  }
  if (jwk.use && jwk.use !== 'sig' && jwk.use !== 'enc') {
    throw new Error(`Invalid key use: ${jwk.use}`);
  }
  if (Array.isArray(jwk.key_ops)) {
    const validOps = [
      'sign',
      'verify',
      'encrypt',
      'decrypt',
      'wrapKey',
      'unwrapKey',
      'deriveKey',
      'deriveBits',
    ];
    for (const op of jwk.key_ops) {
      if (!validOps.includes(op)) {
        throw new Error(`Invalid key operation: ${op}`);
      }
    }
  }
}

function redactPrivate(jwk: any) {
  const redacted = { ...jwk };
  for (const k of ['d', 'p', 'q', 'dp', 'dq', 'qi', 'oth', 'k']) {
    if (k in redacted) {
      redacted[k] = '[redacted]';
    }
  }
  return redacted;
}

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

function b64ToUint8Array(b64: string): Uint8Array {
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

async function tryImportPem(
  pem: string,
  passphrase?: string
): Promise<{ key: CryptoKey; cert?: string }> {
  const attempt = async (p: string) => {
    for (const alg of algorithms) {
      try {
        return { key: (await importPKCS8(p, alg)) as CryptoKey };
      } catch {}
      try {
        return { key: (await importSPKI(p, alg)) as CryptoKey };
      } catch {}
      try {
        return { key: (await importX509(p, alg)) as CryptoKey, cert: p };
      } catch {}
    }
    throw new Error('Unsupported PEM/DER key');
  };

  try {
    return await attempt(pem);
  } catch (e) {
    if (passphrase) {
      try {
        const sshpk = await import('sshpk');
        const pk = sshpk.parsePrivateKey(pem, 'pem', { passphrase });
        const decrypted = pk.toString('pkcs8');
        return await attempt(decrypted);
      } catch {}
    } else if (pem.includes('ENCRYPTED')) {
      throw new Error('Passphrase required to decrypt key');
    }
    throw e;
  }
}

const KeyConverter: React.FC = () => {
  const [inputFormat, setInputFormat] = useState('pem');
  const [outputFormat, setOutputFormat] = useState('jwk');

  const [key, setKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [thumbprint, setThumbprint] = useState('');
  const [x5c, setX5c] = useState('');
  const [x5t, setX5t] = useState('');
  const [x5tS256, setX5tS256] = useState('');
  const [warning, setWarning] = useState('');

  const convert = async () => {
    try {
      setError('');
      setWarning('');
      setThumbprint('');
      setX5c('');
      setX5t('');
      setX5tS256('');
      let cryptoKey: CryptoKey;
      let cert: string | undefined;
      let jwkInput: any;
      if (inputFormat === 'jwk') {
        jwkInput = JSON.parse(key);
        cryptoKey = await tryImportJwk(jwkInput);
        if (Array.isArray(jwkInput.x5c) && jwkInput.x5c.length > 0) {
          cert = `-----BEGIN CERTIFICATE-----\n${jwkInput.x5c[0]}\n-----END CERTIFICATE-----`;
        }
      } else if (inputFormat === 'pem') {
        ({ key: cryptoKey, cert } = await tryImportPem(key, passphrase));
      } else {
        const b64 = key.replace(/\s+/g, '');
        const body = b64.match(/.{1,64}/g)?.join('\n') || '';
        const pkcs8Pem = `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`;
        const spkiPem = `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`;
        const certPem = `-----BEGIN CERTIFICATE-----\n${body}\n-----END CERTIFICATE-----`;
        try {
          ({ key: cryptoKey, cert } = await tryImportPem(pkcs8Pem, passphrase));
        } catch {
          try {
            ({ key: cryptoKey, cert } = await tryImportPem(spkiPem, passphrase));
          } catch {
            ({ key: cryptoKey, cert } = await tryImportPem(certPem, passphrase));
          }
        }
      }

      let jwk = await exportJWK(cryptoKey);
      if (jwkInput) {
        jwk = { ...jwk, ...jwkInput };
      }
      validateKey(jwk);
      setThumbprint(await calculateJwkThumbprint(jwk));

      if (cert) {
        const certB64 = cert
          .replace(/-----(BEGIN|END)[^\n]+-----/g, '')
          .replace(/\s+/g, '');
        setX5c(certB64);
        const der = b64ToUint8Array(certB64);
        const sha1 = await crypto.subtle.digest('SHA-1', der);
        const sha256 = await crypto.subtle.digest('SHA-256', der);
        const toB64Url = (buf: ArrayBuffer) =>
          btoa(String.fromCharCode(...new Uint8Array(buf)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        const x5tSha1 = toB64Url(sha1);
        const x5tSha256 = toB64Url(sha256);
        setX5t(x5tSha1);
        setX5tS256(x5tSha256);
        jwk.x5c = [certB64];
        jwk.x5t = x5tSha1;
        jwk['x5t#S256'] = x5tSha256;
      }

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

      const redactedJwk = redactPrivate(jwk);

      if (outputFormat === 'jwk') {
        setResult(JSON.stringify(redactedJwk, null, 2));
      } else if (outputFormat === 'pem') {
        if (cert) {
          setResult(cert);
        } else if ('d' in jwk) {
          setResult(await exportPKCS8(cryptoKey));
        } else {
          setResult(await exportSPKI(cryptoKey));
        }
      } else {
        if (cert) {
          setResult(
            cert.replace(/-----(BEGIN|END)[^\n]+-----/g, '').replace(/\s+/g, '')
          );
        } else {
          let pem: string;
          if ('d' in jwk) {
            pem = await exportPKCS8(cryptoKey);
          } else {
            pem = await exportSPKI(cryptoKey);
          }
          const b64 = pem
            .replace(/-----(BEGIN|END)[^\n]+-----/g, '')
            .replace(/\s+/g, '');
          setResult(b64);
        }
      }
    } catch (e: unknown) {
      let errorMsg = 'Unknown error';
      if (
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        typeof (e as any).message === 'string'
      ) {
        errorMsg = (e as any).message;
      }
      setError(errorMsg);
      setResult('');
      setThumbprint('');
      setX5c('');
      setX5t('');
      setX5tS256('');
      setWarning('');
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
  };

  const download = () => {
    const ext = outputFormat === 'jwk' ? 'json' : outputFormat;
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `key.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
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
        <input
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          className="px-2 py-1 text-black rounded"
          placeholder="Passphrase"
        />

        <button onClick={convert} className="px-3 py-1 bg-blue-600 rounded">
          Convert
        </button>
        {result && (
          <>
            <button
              onClick={copy}
              className="px-3 py-1 bg-green-600 rounded"
            >
              Copy
            </button>
            <button
              onClick={download}
              className="px-3 py-1 bg-purple-600 rounded"
            >
              Download
            </button>
          </>
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
      {x5c && (
        <div>
          <strong>x5c:</strong> {x5c}
        </div>
      )}
      {x5t && (
        <div>
          <strong>x5t:</strong> {x5t}
        </div>
      )}
      {x5tS256 && (
        <div>
          <strong>x5t#S256:</strong> {x5tS256}
        </div>
      )}
      {warning && <div className="text-yellow-400">{warning}</div>}
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
};

export default KeyConverter;
export const displayKeyConverter = () => <KeyConverter />;

