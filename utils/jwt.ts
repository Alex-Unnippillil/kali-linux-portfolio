const textEncoder = new TextEncoder();

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  if (typeof btoa === 'function') {
    return btoa(binary);
  }

  throw new Error('No base64 encoder available in this environment.');
};

export const base64UrlEncode = (buffer: ArrayBuffer): string => {
  const base64 = arrayBufferToBase64(buffer);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
};

export const base64UrlToUint8Array = (input: string): Uint8Array => {
  if (!input) {
    return new Uint8Array();
  }

  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  try {
    if (typeof atob === 'function') {
      const binary = atob(padded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }

    if (typeof Buffer !== 'undefined') {
      return Uint8Array.from(Buffer.from(padded, 'base64'));
    }
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Invalid base64url encoding.'
    );
  }

  throw new Error('No base64 decoder available in this environment.');
};

const timingSafeEqual = (a: string, b: string): boolean => {
  const aBytes = textEncoder.encode(a);
  const bBytes = textEncoder.encode(b);

  if (aBytes.length !== bBytes.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < aBytes.length; i += 1) {
    result |= aBytes[i] ^ bBytes[i];
  }

  return result === 0;
};

export const computeHs256Signature = async (
  signingInput: string,
  secret: string
): Promise<string> => {
  const cryptoImpl = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined;

  if (!cryptoImpl?.subtle) {
    throw new Error('Web Crypto API is unavailable.');
  }

  const key = await cryptoImpl.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await cryptoImpl.subtle.sign(
    'HMAC',
    key,
    textEncoder.encode(signingInput)
  );

  return base64UrlEncode(signature);
};

export type VerificationMessageKey =
  | 'idle'
  | 'malformed'
  | 'missing-secret'
  | 'valid'
  | 'invalid'
  | 'error';

export interface VerificationMessageOptions {
  error?: string;
}

export const createVerificationMessage = (
  key: VerificationMessageKey,
  options: VerificationMessageOptions = {}
): string => {
  switch (key) {
    case 'idle':
      return 'Enter a JWT to inspect.';
    case 'malformed':
      return 'JWT must include header, payload, and signature segments separated by dots.';
    case 'missing-secret':
      return 'Provide a secret to verify the signature.';
    case 'valid':
      return 'Signature verified with HS256.';
    case 'invalid':
      return 'Signature mismatch for HS256 verification.';
    case 'error':
    default:
      return `Unable to compute HS256 signature${options.error ? `: ${options.error}` : '.'}`;
  }
};

export interface VerificationResult {
  status: VerificationMessageKey;
  message: string;
  expectedSignature?: string;
  receivedSignature?: string;
}

export const verifyHs256Signature = async (
  token: string,
  secret: string
): Promise<VerificationResult> => {
  const trimmedToken = token.trim();

  if (!trimmedToken) {
    return {
      status: 'idle',
      message: createVerificationMessage('idle'),
    };
  }

  const segments = trimmedToken.split('.');

  if (segments.length !== 3) {
    return {
      status: 'malformed',
      message: createVerificationMessage('malformed'),
    };
  }

  const [header, payload, signature] = segments;

  if (!secret) {
    return {
      status: 'missing-secret',
      message: createVerificationMessage('missing-secret'),
      receivedSignature: signature,
    };
  }

  try {
    const expected = await computeHs256Signature(`${header}.${payload}`, secret);
    const valid = timingSafeEqual(signature, expected);

    if (valid) {
      return {
        status: 'valid',
        message: createVerificationMessage('valid'),
        expectedSignature: expected,
        receivedSignature: signature,
      };
    }

    return {
      status: 'invalid',
      message: createVerificationMessage('invalid'),
      expectedSignature: expected,
      receivedSignature: signature,
    };
  } catch (error) {
    return {
      status: 'error',
      message: createVerificationMessage('error', {
        error: error instanceof Error ? error.message : String(error),
      }),
      receivedSignature: signature,
    };
  }
};
