export interface Entry {
  data: string;
  timestamp: string;
  hash: string;
}

const te = new TextEncoder();

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function hashEntry(
  data: string,
  prevHash: string,
  timestamp: string
): Promise<string> {
  const input = prevHash + timestamp + data;
  const buffer = await crypto.subtle.digest('SHA-256', te.encode(input));
  return bufferToHex(buffer);
}

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
}

export async function signData(
  data: string,
  privateKey: CryptoKey
): Promise<string> {
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    te.encode(data)
  );
  return bufferToBase64(sig);
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const spki = await crypto.subtle.exportKey('spki', key);
  return bufferToBase64(spki);
}

export async function verifySignature(
  data: string,
  sigB64: string,
  publicKeyB64: string
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'spki',
    base64ToArrayBuffer(publicKeyB64),
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['verify']
  );
  const signature = base64ToArrayBuffer(sigB64);
  return crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    signature,
    te.encode(data)
  );
}

export async function verifyChain(entries: Entry[]): Promise<boolean> {
  let prevHash = '';
  for (const entry of entries) {
    const expected = await hashEntry(entry.data, prevHash, entry.timestamp);
    if (expected !== entry.hash) {
      return false;
    }
    prevHash = entry.hash;
  }
  return true;
}
