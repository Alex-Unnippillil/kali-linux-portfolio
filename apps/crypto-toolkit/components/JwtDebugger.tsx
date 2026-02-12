'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';
import {
  base64UrlToUint8Array,
  createVerificationMessage,
  VerificationResult,
  verifyHs256Signature,
} from '@/utils/jwt';

interface DecodedSegment {
  formatted: string;
  error?: string;
}

let sharedDecoder: TextDecoder | undefined;

const decodeUtf8 = (bytes: Uint8Array): string => {
  if (typeof TextDecoder !== 'undefined') {
    if (!sharedDecoder) {
      sharedDecoder = new TextDecoder();
    }
    return sharedDecoder.decode(bytes);
  }

  let result = '';
  for (let i = 0; i < bytes.length; i += 1) {
    result += String.fromCharCode(bytes[i]);
  }
  return result;
};

const decodeSegment = (segment: string): DecodedSegment => {
  if (!segment) {
    return { formatted: '' };
  }

  try {
    const decoded = decodeUtf8(base64UrlToUint8Array(segment));
    try {
      const parsed = JSON.parse(decoded);
      return { formatted: JSON.stringify(parsed, null, 2) };
    } catch {
      return { formatted: decoded };
    }
  } catch (error) {
    return {
      formatted: '',
      error:
        error instanceof Error ? error.message : 'Unable to decode segment.',
    };
  }
};

const JwtDebugger: React.FC = () => {
  const [token, setToken] = useState('');
  const [secret, setSecret] = useState('');
  const [verification, setVerification] = useState<VerificationResult>({
    status: 'idle',
    message: createVerificationMessage('idle'),
  });
  const tokenInputId = useId();
  const secretInputId = useId();

  const headerSegment = useMemo(() => token.split('.')[0] ?? '', [token]);
  const payloadSegment = useMemo(() => token.split('.')[1] ?? '', [token]);

  const header = useMemo(() => decodeSegment(headerSegment), [headerSegment]);
  const payload = useMemo(() => decodeSegment(payloadSegment), [payloadSegment]);

  useEffect(() => {
    let cancelled = false;

    const runVerification = async () => {
      const result = await verifyHs256Signature(token, secret);
      if (!cancelled) {
        setVerification(result);
      }
    };

    void runVerification();

    return () => {
      cancelled = true;
    };
  }, [secret, token]);

  return (
    <div className="flex h-full flex-col gap-4 bg-gray-900 p-4 text-sm text-gray-100">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label
            htmlFor={tokenInputId}
            className="text-xs font-semibold uppercase tracking-wider text-gray-400"
          >
            JWT Token
          </label>
          <textarea
            id={tokenInputId}
            aria-label="JWT Token"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className="min-h-[120px] rounded border border-gray-700 bg-black/60 p-3 font-mono text-green-200 focus:border-cyan-400 focus:outline-none"
            placeholder="Paste a JWT (header.payload.signature)"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label
            htmlFor={secretInputId}
            className="text-xs font-semibold uppercase tracking-wider text-gray-400"
          >
            Shared Secret
          </label>
          <input
            id={secretInputId}
            aria-label="Shared Secret"
            type="text"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            className="rounded border border-gray-700 bg-black/60 p-3 font-mono text-green-200 focus:border-cyan-400 focus:outline-none"
            placeholder="Secret used for HS256"
          />
        </div>
      </div>

      <section className="rounded border border-gray-800 bg-black/40 p-4">
        <h2 className="text-lg font-semibold text-cyan-300">Verification</h2>
        <p role="status" className="mt-2 text-sm">
          {verification.message}
        </p>
        {verification.expectedSignature && (
          <div className="mt-3">
            <span className="block text-xs uppercase tracking-wider text-gray-500">
              Computed Signature
            </span>
            <code className="mt-1 block break-all rounded bg-gray-800/60 p-2 text-[13px] text-green-200">
              {verification.expectedSignature}
            </code>
          </div>
        )}
        {verification.receivedSignature && (
          <div className="mt-3">
            <span className="block text-xs uppercase tracking-wider text-gray-500">
              Token Signature
            </span>
            <code className="mt-1 block break-all rounded bg-gray-800/60 p-2 text-[13px] text-green-200">
              {verification.receivedSignature}
            </code>
          </div>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded border border-gray-800 bg-black/40 p-4">
          <h3 className="text-base font-semibold text-cyan-200">Header</h3>
          {header.error ? (
            <p className="mt-2 text-amber-400">{header.error}</p>
          ) : (
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-950/80 p-3 font-mono text-[13px] text-green-200">
              {header.formatted || 'Decoded header will appear here.'}
            </pre>
          )}
        </section>
        <section className="rounded border border-gray-800 bg-black/40 p-4">
          <h3 className="text-base font-semibold text-cyan-200">Payload</h3>
          {payload.error ? (
            <p className="mt-2 text-amber-400">{payload.error}</p>
          ) : (
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-950/80 p-3 font-mono text-[13px] text-green-200">
              {payload.formatted || 'Decoded payload will appear here.'}
            </pre>
          )}
        </section>
      </div>
    </div>
  );
};

export default JwtDebugger;
