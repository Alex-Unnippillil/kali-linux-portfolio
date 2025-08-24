import React, { useEffect, useRef, useState } from 'react';

const JwsJweWorkbench: React.FC = () => {
  const workerRef = useRef<Worker>();
  const callbacks = useRef(new Map<string, { resolve: (v: any) => void; reject: (e: any) => void }>());

  const [keys, setKeys] = useState<null | { rsa: any; ec: any }>(null);
  const [format, setFormat] = useState<'pem' | 'jwks'>('pem');
  const [jwsAlg, setJwsAlg] = useState('RS256');
  const [jweAlg, setJweAlg] = useState('RSA-OAEP');

  const [jws, setJws] = useState('');
  const [verifyResult, setVerifyResult] = useState('');
  const [jwe, setJwe] = useState('');
  const [decryptResult, setDecryptResult] = useState('');
  const [detached, setDetached] = useState(false);
  const [multiSig, setMultiSig] = useState(false);
  const [jwsParts, setJwsParts] = useState<
    | null
    | {
        payload: any;
        signatures: { header: any; signature: string }[];
      }
  >(null);
  const [keyInput, setKeyInput] = useState('');
  const [keyAlg, setKeyAlg] = useState('RS256');
  const [keyResult, setKeyResult] = useState('');
  const [keyErr, setKeyErr] = useState('');

  const [signErr, setSignErr] = useState('');
  const [verifyErr, setVerifyErr] = useState('');
  const [encryptErr, setEncryptErr] = useState('');
  const [decryptErr, setDecryptErr] = useState('');

  useEffect(() => {
    workerRef.current = new Worker(new URL('./jose.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current.onmessage = (e: MessageEvent) => {
      const { id, rsa, ec, result, error } = e.data as any;
      if (id === 'init') {
        setKeys({ rsa, ec });
        return;
      }
      const cb = callbacks.current.get(id);
      if (cb) {
        callbacks.current.delete(id);
        if (error) cb.reject(error);
        else cb.resolve(result);
      }
    };
    return () => workerRef.current?.terminate();
  }, []);

  const callWorker = (action: string, data: any) =>
    new Promise<any>((resolve, reject) => {
      const id = crypto.randomUUID();
      callbacks.current.set(id, { resolve, reject });
      workerRef.current?.postMessage({ id, action, ...data });
    });

  if (!keys) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-900 text-white">
        Generating keys...
      </div>
    );
  }

  const privateKeyData =
    format === 'pem'
      ? keys.rsa.privatePem
      : JSON.stringify({ keys: [keys.rsa.privateJwk] }, null, 2);
  const publicKeyData =
    format === 'pem'
      ? keys.rsa.publicPem
      : JSON.stringify({ keys: [keys.rsa.publicJwk] }, null, 2);

  const signSnippet =
    format === 'pem'
      ? `import { CompactSign, importPKCS8 } from 'jose';

const privateKeyPem = \`${privateKeyData}\`;
const privateKey = await importPKCS8(privateKeyPem, '${jwsAlg}');
const payload = { msg: 'hello' };
let jws = await new CompactSign(new TextEncoder().encode(JSON.stringify(payload)))
  .setProtectedHeader({ alg: '${jwsAlg}', kid: 'demo'${detached ? ", b64: false, crit: ['b64']" : ''} })
  .sign(privateKey);
${detached ? "const parts = jws.split('.');\nparts[1] = '';\njws = parts.join('.');" : ''}`
      : `import { CompactSign, importJWK } from 'jose';

const jwks = ${privateKeyData};
const privateKey = await importJWK(jwks.keys[0], '${jwsAlg}');
const payload = { msg: 'hello' };
let jws = await new CompactSign(new TextEncoder().encode(JSON.stringify(payload)))
  .setProtectedHeader({ alg: '${jwsAlg}', kid: 'demo'${detached ? ", b64: false, crit: ['b64']" : ''} })
  .sign(privateKey);
${detached ? "const parts = jws.split('.');\nparts[1] = '';\njws = parts.join('.');" : ''}`;

  const verifySnippet =
    format === 'pem'
      ? `import { compactVerify, importSPKI } from 'jose';

const publicKeyPem = \`${publicKeyData}\`;
const publicKey = await importSPKI(publicKeyPem, '${jwsAlg}');
const { payload, protectedHeader } = await compactVerify(jws, publicKey${detached ? ", { payload: new TextEncoder().encode(JSON.stringify({ msg: 'hello' })), crit: ['b64'] }" : ''});
const data = JSON.parse(new TextDecoder().decode(payload));`
      : `import { compactVerify, importJWK } from 'jose';

const jwks = ${publicKeyData};
const publicKey = await importJWK(jwks.keys[0], '${jwsAlg}');
const { payload, protectedHeader } = await compactVerify(jws, publicKey${detached ? ", { payload: new TextEncoder().encode(JSON.stringify({ msg: 'hello' })), crit: ['b64'] }" : ''});
const data = JSON.parse(new TextDecoder().decode(payload));`;

  const encryptSnippet =
    format === 'pem'
      ? `import { CompactEncrypt, importSPKI } from 'jose';

const publicKeyPem = \`${publicKeyData}\`;
const publicKey = await importSPKI(publicKeyPem, '${jweAlg}');
const jwe = await new CompactEncrypt(new TextEncoder().encode(JSON.stringify(payload)))
  .setProtectedHeader({ alg: '${jweAlg}', enc: 'A256GCM', kid: 'demo' })
  .encrypt(publicKey);`
      : `import { CompactEncrypt, importJWK } from 'jose';

const jwks = ${publicKeyData};
const publicKey = await importJWK(jwks.keys[0], '${jweAlg}');
const jwe = await new CompactEncrypt(new TextEncoder().encode(JSON.stringify(payload)))
  .setProtectedHeader({ alg: '${jweAlg}', enc: 'A256GCM', kid: 'demo' })
  .encrypt(publicKey);`;

  const decryptSnippet =
    format === 'pem'
      ? `import { compactDecrypt, importPKCS8 } from 'jose';

const privateKeyPem = \`${privateKeyData}\`;
const privateKey = await importPKCS8(privateKeyPem, '${jweAlg}');
const { plaintext } = await compactDecrypt(jwe, privateKey);
const payload = JSON.parse(new TextDecoder().decode(plaintext));`
      : `import { compactDecrypt, importJWK } from 'jose';

const jwks = ${privateKeyData};
const privateKey = await importJWK(jwks.keys[0], '${jweAlg}');
const { plaintext } = await compactDecrypt(jwe, privateKey);
const payload = JSON.parse(new TextDecoder().decode(plaintext));`;

  const copy = (text: string) => navigator.clipboard.writeText(text);

  const b64UrlDecode = (str: string) => {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4 ? '='.repeat(4 - (base64.length % 4)) : '';
    return atob(base64 + pad);
  };

  const parseJws = (token: string) => {
    try {
      if (token.trim().startsWith('{')) {
        const obj = JSON.parse(token);
        const payload = obj.payload ? JSON.parse(b64UrlDecode(obj.payload)) : null;
        const signatures = (obj.signatures || []).map((s: any) => ({
          header: JSON.parse(b64UrlDecode(s.protected)),
          signature: s.signature as string,
        }));
        setJwsParts({ payload, signatures });
      } else {
        const [h, p, s] = token.split('.');
        const header = JSON.parse(b64UrlDecode(h));
        const payload = p ? JSON.parse(b64UrlDecode(p)) : null;
        setJwsParts({ payload, signatures: [{ header, signature: s }] });
      }
    } catch {
      setJwsParts(null);
    }
  };

  const sign = async () => {
    setSignErr('');
    try {
      const token = await callWorker('sign', {
        payload: { msg: 'hello' },
        key: privateKeyData,
        alg: jwsAlg,
        kid: 'demo',
        detached,
        multi: multiSig,
      });
      const tokenStr = typeof token === 'string' ? token : JSON.stringify(token);
      setJws(tokenStr);
      parseJws(tokenStr);
    } catch (e) {
      setSignErr(String(e));
    }
  };

  const verify = async () => {
    setVerifyErr('');
    parseJws(jws);
    try {
      const res = await callWorker('verify', {
        token: jws,
        key: publicKeyData,
        alg: jwsAlg,
        detached,
        payload: { msg: 'hello' },
      });
      setVerifyResult(JSON.stringify(res, null, 2));
    } catch (e) {
      setVerifyErr(String(e));
    }
  };

  const convertPemToJwk = async () => {
    setKeyErr('');
    try {
      const res = await callWorker('convert', {
        direction: 'pem2jwk',
        key: keyInput,
        alg: keyAlg,
      });
      setKeyResult(JSON.stringify(res, null, 2));
    } catch (e) {
      setKeyErr(String(e));
      setKeyResult('');
    }
  };

  const convertJwkToPem = async () => {
    setKeyErr('');
    try {
      const res = await callWorker('convert', {
        direction: 'jwk2pem',
        key: keyInput,
        alg: keyAlg,
      });
      setKeyResult(typeof res === 'string' ? res : JSON.stringify(res, null, 2));
    } catch (e) {
      setKeyErr(String(e));
      setKeyResult('');
    }
  };

  const encrypt = async () => {
    setEncryptErr('');
    try {
      const token = await callWorker('encrypt', {
        payload: { msg: 'hello' },
        key: publicKeyData,
        alg: jweAlg,
        enc: 'A256GCM',
        kid: 'demo',
      });
      setJwe(token);
    } catch (e) {
      setEncryptErr(String(e));
    }
  };

  const decrypt = async () => {
    setDecryptErr('');
    try {
      const res = await callWorker('decrypt', {
        token: jwe,
        key: privateKeyData,
        alg: jweAlg,
      });
      setDecryptResult(JSON.stringify(res, null, 2));
    } catch (e) {
      setDecryptErr(String(e));
    }
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto space-y-6">
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center">
          Key Format:
          <select
            className="ml-2 p-1 text-black rounded"
            value={format}
            onChange={(e) => setFormat(e.target.value as 'pem' | 'jwks')}
          >
            <option value="pem">PEM</option>
            <option value="jwks">JWKS</option>
          </select>
        </label>
        <label className="flex items-center">
          JWS alg:
          <input
            className="ml-2 p-1 text-black rounded w-32"
            value={jwsAlg}
            onChange={(e) => setJwsAlg(e.target.value)}
          />
        </label>
        <label className="flex items-center">
          JWE alg:
          <input
            className="ml-2 p-1 text-black rounded w-32"
            value={jweAlg}
            onChange={(e) => setJweAlg(e.target.value)}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-bold mb-2">Private {format.toUpperCase()}</h3>
          <pre className="bg-black p-2 rounded whitespace-pre-wrap break-all">{privateKeyData}</pre>
          <button
            type="button"
            onClick={() => copy(privateKeyData)}
            className="mt-2 px-3 py-1 bg-blue-600 rounded"
          >
            Copy
          </button>
        </div>
        <div>
          <h3 className="font-bold mb-2">Public {format.toUpperCase()}</h3>
          <pre className="bg-black p-2 rounded whitespace-pre-wrap break-all">{publicKeyData}</pre>
          <button
            type="button"
            onClick={() => copy(publicKeyData)}
            className="mt-2 px-3 py-1 bg-blue-600 rounded"
          >
            Copy
          </button>
        </div>
      </div>

      <div>
        <h3 className="font-bold mb-2">Convert PEM ↔ JWK</h3>
        <div className="flex flex-wrap gap-2 mb-2">
          <input
            value={keyAlg}
            onChange={(e) => setKeyAlg(e.target.value)}
            className="p-1 text-black rounded w-32"
            placeholder="Alg"
          />
          <button onClick={convertPemToJwk} className="px-3 py-1 bg-blue-600 rounded">
            PEM→JWK
          </button>
          <button onClick={convertJwkToPem} className="px-3 py-1 bg-blue-600 rounded">
            JWK→PEM
          </button>
        </div>
        <textarea
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          className="w-full h-32 p-2 text-black rounded"
          placeholder="Key"
        />
        {keyResult && (
          <pre className="bg-black p-2 rounded mt-2 whitespace-pre-wrap break-all">{keyResult}</pre>
        )}
        {keyErr && <div className="text-red-400 mt-2">{keyErr}</div>}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2">Step 1: Sign JWS</h2>
        <pre className="bg-black p-2 rounded whitespace-pre-wrap break-all">{signSnippet}</pre>
        <div className="mt-2 flex flex-wrap gap-2 items-center">
          <button onClick={() => copy(signSnippet)} className="px-3 py-1 bg-blue-600 rounded">Copy</button>
          <button onClick={sign} className="px-3 py-1 bg-green-600 rounded">Sign</button>
          <label className="flex items-center">
            <input
              type="checkbox"
              className="ml-2 mr-1"
              checked={detached}
              onChange={(e) => setDetached(e.target.checked)}
            />
            Detached
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              className="ml-2 mr-1"
              checked={multiSig}
              onChange={(e) => setMultiSig(e.target.checked)}
            />
            Multi-sig
          </label>
        </div>
        {signErr && <div className="text-red-400 mt-2">{signErr}</div>}
        {jws && (
          <>
            <pre className="bg-black p-2 rounded mt-2 break-all whitespace-pre-wrap">{jws}</pre>
            {jwsParts && (
              <div className="bg-black p-2 rounded mt-2 space-y-2">
                <div>
                  <div className="font-bold">Payload</div>
                  <pre className="whitespace-pre-wrap break-all">{
                    jwsParts.payload
                      ? JSON.stringify(jwsParts.payload, null, 2)
                      : '(detached)'
                  }</pre>
                </div>
                {jwsParts.signatures.map((s, i) => (
                  <div key={i} className="mt-2">
                    <div className="font-bold">Header {i + 1}</div>
                    <pre className="whitespace-pre-wrap break-all">{JSON.stringify(s.header, null, 2)}</pre>
                    <div className="font-bold">Signature {i + 1}</div>
                    <pre className="whitespace-pre-wrap break-all">{s.signature}</pre>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2">Step 2: Verify JWS</h2>
        <pre className="bg-black p-2 rounded whitespace-pre-wrap break-all">{verifySnippet}</pre>
        <div className="mt-2 flex gap-2">
          <button onClick={() => copy(verifySnippet)} className="px-3 py-1 bg-blue-600 rounded">Copy</button>
          <button onClick={verify} className="px-3 py-1 bg-green-600 rounded" disabled={!jws}>Verify</button>
        </div>
        {verifyErr && <div className="text-red-400 mt-2">{verifyErr}</div>}
        {verifyResult && <pre className="bg-black p-2 rounded mt-2 break-all whitespace-pre-wrap">{verifyResult}</pre>}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2">Step 3: Encrypt JWE</h2>
        <pre className="bg-black p-2 rounded whitespace-pre-wrap break-all">{encryptSnippet}</pre>
        <div className="mt-2 flex gap-2">
          <button onClick={() => copy(encryptSnippet)} className="px-3 py-1 bg-blue-600 rounded">Copy</button>
          <button onClick={encrypt} className="px-3 py-1 bg-green-600 rounded">Encrypt</button>
        </div>
        {encryptErr && <div className="text-red-400 mt-2">{encryptErr}</div>}
        {jwe && <pre className="bg-black p-2 rounded mt-2 break-all whitespace-pre-wrap">{jwe}</pre>}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2">Step 4: Decrypt JWE</h2>
        <pre className="bg-black p-2 rounded whitespace-pre-wrap break-all">{decryptSnippet}</pre>
        <div className="mt-2 flex gap-2">
          <button onClick={() => copy(decryptSnippet)} className="px-3 py-1 bg-blue-600 rounded">Copy</button>
          <button onClick={decrypt} className="px-3 py-1 bg-green-600 rounded" disabled={!jwe}>Decrypt</button>
        </div>
        {decryptErr && <div className="text-red-400 mt-2">{decryptErr}</div>}
        {decryptResult && <pre className="bg-black p-2 rounded mt-2 break-all whitespace-pre-wrap">{decryptResult}</pre>}
      </div>
    </div>
  );
};

export default JwsJweWorkbench;

export const displayJwsJweWorkbench = () => <JwsJweWorkbench />;
