import React, { useState } from 'react';
import {
  SignJWT,
  jwtVerify,
  CompactEncrypt,
  compactDecrypt,
  FlattenedSign,
  FlattenedEncrypt,
} from 'jose';

const JwsJweWorkbench = () => {
  const [mode, setMode] = useState('sign');
  const [payload, setPayload] = useState('');
  const [key, setKey] = useState('');
  const [alg, setAlg] = useState('');
  const [kid, setKid] = useState('');
  const [aud, setAud] = useState('');
  const [compact, setCompact] = useState('');
  const [json, setJson] = useState('');
  const [result, setResult] = useState('');

  const handleRun = async () => {
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const keyData = enc.encode(key);
    try {
      if (mode === 'sign') {
        const payloadObj = payload ? JSON.parse(payload) : {};
        if (aud) payloadObj.aud = aud;
        const jws = await new SignJWT(payloadObj)
          .setProtectedHeader({ alg, ...(kid ? { kid } : {}) })
          .sign(keyData);
        const jwsJson = await new FlattenedSign(enc.encode(JSON.stringify(payloadObj)))
          .setProtectedHeader({ alg, ...(kid ? { kid } : {}) })
          .sign(keyData);
        setCompact(jws);
        setJson(JSON.stringify(jwsJson, null, 2));
        setResult('');
      } else if (mode === 'verify') {
        const { payload: pl, protectedHeader } = await jwtVerify(payload, keyData, {
          audience: aud || undefined,
          algorithms: alg ? [alg] : undefined,
        });
        setResult(
          JSON.stringify({ payload: pl, header: protectedHeader }, null, 2)
        );
        setCompact('');
        setJson('');
      } else if (mode === 'encrypt') {
        const payloadObj = payload ? JSON.parse(payload) : {};
        if (aud) payloadObj.aud = aud;
        const input = enc.encode(JSON.stringify(payloadObj));
        const header = { alg: 'dir', enc: alg, ...(kid ? { kid } : {}) };
        const jweCompact = await new CompactEncrypt(input)
          .setProtectedHeader(header)
          .encrypt(keyData);
        const jweJson = await new FlattenedEncrypt(input)
          .setProtectedHeader(header)
          .encrypt(keyData);
        setCompact(jweCompact);
        setJson(JSON.stringify(jweJson, null, 2));
        setResult('');
      } else if (mode === 'decrypt') {
        const { plaintext, protectedHeader } = await compactDecrypt(payload, keyData);
        const pl = JSON.parse(dec.decode(plaintext));
        if (aud && pl.aud && pl.aud !== aud) {
          setResult('aud mismatch');
        } else {
          setResult(
            JSON.stringify({ payload: pl, header: protectedHeader }, null, 2)
          );
        }
        setCompact('');
        setJson('');
      }
    } catch (e: any) {
      setResult(`Error: ${e.message}`);
      setCompact('');
      setJson('');
    }
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto space-y-4">
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center">Mode:
          <select
            className="ml-2 p-1 rounded text-black"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="sign">Sign</option>
            <option value="verify">Verify</option>
            <option value="encrypt">Encrypt</option>
            <option value="decrypt">Decrypt</option>
          </select>
        </label>
        <label className="flex items-center">Alg:
          <input
            className="ml-2 p-1 rounded text-black"
            value={alg}
            onChange={(e) => setAlg(e.target.value)}
            placeholder="HS256 or A256GCM"
          />
        </label>
        <label className="flex items-center">kid:
          <input
            className="ml-2 p-1 rounded text-black"
            value={kid}
            onChange={(e) => setKid(e.target.value)}
            placeholder="optional"
          />
        </label>
        <label className="flex items-center">aud:
          <input
            className="ml-2 p-1 rounded text-black"
            value={aud}
            onChange={(e) => setAud(e.target.value)}
            placeholder="optional"
          />
        </label>
      </div>
      <textarea
        className="w-full h-40 p-2 rounded text-black"
        placeholder={mode === 'sign' || mode === 'encrypt' ? 'Payload JSON' : 'Input token'}
        value={payload}
        onChange={(e) => setPayload(e.target.value)}
      />
      <input
        type="text"
        className="w-full p-2 rounded text-black"
        placeholder="Key"
        value={key}
        onChange={(e) => setKey(e.target.value)}
      />
      <button
        onClick={handleRun}
        className="px-4 py-2 bg-blue-600 rounded"
      >
        Run
      </button>
      {compact && (
        <div>
          <h3 className="font-bold mb-2">Compact</h3>
          <pre className="whitespace-pre-wrap break-all bg-black p-2 rounded">{compact}</pre>
        </div>
      )}
      {json && (
        <div>
          <h3 className="font-bold mb-2">JSON</h3>
          <pre className="whitespace-pre-wrap break-all bg-black p-2 rounded">{json}</pre>
        </div>
      )}
      {result && (
        <div>
          <h3 className="font-bold mb-2">Result</h3>
          <pre className="whitespace-pre-wrap break-all bg-black p-2 rounded">{result}</pre>
        </div>
      )}
    </div>
  );
};

export default JwsJweWorkbench;

export const displayJwsJweWorkbench = () => <JwsJweWorkbench />;

