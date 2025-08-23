import React, { useState } from 'react';
import {
  decodeJwt,
  decodeProtectedHeader,
  jwtVerify,
  createRemoteJWKSet,
} from 'jose';

const JwtInspector: React.FC = () => {
  const [token, setToken] = useState('');
  const [header, setHeader] = useState<Record<string, unknown> | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [warning, setWarning] = useState('');
  const [jwkUrl, setJwkUrl] = useState('');
  const [verification, setVerification] = useState('');

  const parseToken = (t: string) => {
    setWarning('');
    setHeader(null);
    setPayload(null);
    setVerification('');
    if (!t) return;
    try {
      const h = decodeProtectedHeader(t);
      const p = decodeJwt(t);
      setHeader(h as Record<string, unknown>);
      setPayload(p as Record<string, unknown>);
      if (typeof p.exp === 'number' && p.exp * 1000 < Date.now()) {
        setWarning('Token expired');
      }
    } catch {
      setWarning('Malformed token');
    }
  };

  const verify = async () => {
    if (!token || !jwkUrl) {
      setVerification('');
      return;
    }
    try {
      const JWKS = createRemoteJWKSet(new URL(jwkUrl));
      await jwtVerify(token, JWKS);
      setVerification('Signature valid');
    } catch (err) {
      setVerification(`Invalid: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <textarea
        value={token}
        onChange={(e) => {
          const t = e.target.value.trim();
          setToken(t);
          parseToken(t);
        }}
        placeholder="Enter JWT"
        className="w-full h-24 p-2 mb-2 rounded text-black"
      />
      <input
        type="text"
        value={jwkUrl}
        onChange={(e) => setJwkUrl(e.target.value)}
        placeholder="JWK URL (optional)"
        className="w-full p-2 mb-2 rounded text-black"
      />
      <button
        onClick={verify}
        className="px-4 py-2 bg-blue-600 rounded mb-4"
      >
        Verify
      </button>
      {warning && <div className="mb-2 text-yellow-300">{warning}</div>}
      {verification && <div className="mb-2">{verification}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-bold mb-1">Header</h3>
          <pre className="bg-black p-2 rounded whitespace-pre-wrap break-all">
            {header ? JSON.stringify(header, null, 2) : ''}
          </pre>
        </div>
        <div>
          <h3 className="font-bold mb-1">Payload</h3>
          <pre className="bg-black p-2 rounded whitespace-pre-wrap break-all">
            {payload ? JSON.stringify(payload, null, 2) : ''}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default JwtInspector;
export const displayJwtInspector = () => <JwtInspector />;
