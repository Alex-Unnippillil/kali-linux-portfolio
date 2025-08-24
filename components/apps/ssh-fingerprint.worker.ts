import sshpk from 'sshpk';
import { Sequence, Integer, BitString, ObjectIdentifier } from 'asn1js';
import { Buffer } from 'buffer';

type JWK = {
  kty: string;
  n?: string;
  e?: string;
  x?: string;
  y?: string;
  crv?: string;
};

const curveOids: Record<string, string> = {
  'P-256': '1.2.840.10045.3.1.7',
  'P-384': '1.3.132.0.34',
  'P-521': '1.3.132.0.35',
  Ed25519: '1.3.101.112',
};

function b64urlToBuffer(b64url: string): Buffer {
  const pad = 4 - (b64url.length % 4 || 4);
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  return Buffer.from(b64, 'base64');
}

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  if (u8.length > 0 && u8[0] & 0x80) {
    const arr = new Uint8Array(u8.length + 1);
    arr[0] = 0;
    arr.set(u8, 1);
    return arr.buffer;
  }
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.length);
}

function parseJwk(jwk: JWK) {
  if (jwk.kty === 'RSA' && jwk.n && jwk.e) {
    const n = b64urlToBuffer(jwk.n);
    const e = b64urlToBuffer(jwk.e);
    const seq = new Sequence({
      value: [
        new Integer({ valueHex: toArrayBuffer(n) }),
        new Integer({ valueHex: toArrayBuffer(e) }),
      ],
    });
    const der = Buffer.from(seq.toBER(false));
    return sshpk.parseKey(der, 'pkcs1');
  }
  if (jwk.kty === 'EC' && jwk.x && jwk.y && jwk.crv) {
    const x = b64urlToBuffer(jwk.x);
    const y = b64urlToBuffer(jwk.y);
    const curveOid = curveOids[jwk.crv];
    if (!curveOid) throw new Error('Unsupported curve');
    const pub = Buffer.concat([Buffer.from([0x04]), x, y]);
    const alg = new Sequence({
      value: [
        new ObjectIdentifier({ value: '1.2.840.10045.2.1' }),
        new ObjectIdentifier({ value: curveOid }),
      ],
    });
    const spki = new Sequence({
      value: [
        alg,
        new BitString({ valueHex: toArrayBuffer(pub) }),
      ],
    });
    const der = Buffer.from(spki.toBER(false));
    return sshpk.parseKey(der, 'spki');
  }
  if (jwk.kty === 'OKP' && jwk.x && jwk.crv === 'Ed25519') {
    const x = b64urlToBuffer(jwk.x);
    const alg = new Sequence({
      value: [new ObjectIdentifier({ value: curveOids.Ed25519 })],
    });
    const spki = new Sequence({
      value: [alg, new BitString({ valueHex: toArrayBuffer(x) })],
    });
    const der = Buffer.from(spki.toBER(false));
    return sshpk.parseKey(der, 'spki');
  }
  throw new Error('Unsupported JWK');
}

function getDetails(key: sshpk.Key) {
  const result: any = {
    md5: key.fingerprint('md5').toString(),
    sha256: key.fingerprint('sha256').toString(),
    type: key.type,
    size: key.size,
  };
  if ((key as any).curve) result.curve = (key as any).curve;
  if (key.type === 'ecdsa') {
    const q = (key as any).part.Q.data as Uint8Array;
    const len = (q.length - 1) / 2;
    result.x = Buffer.from(q.slice(1, 1 + len)).toString('hex');
    result.y = Buffer.from(q.slice(1 + len)).toString('hex');
  } else if (key.type === 'ed25519') {
    const q = (key as any).part.Q.data as Uint8Array;
    result.x = Buffer.from(q).toString('hex');
  } else if (key.type === 'rsa') {
    const e = (key as any).part.e.data as Uint8Array;
    const n = (key as any).part.n.data as Uint8Array;
    result.exponent = Buffer.from(e).toString('hex');
    result.modulus = Buffer.from(n).toString('hex');
  }
  return result;
}

self.onmessage = (e: MessageEvent) => {
  const { key } = e.data as { key: string };
  try {
    let k;
    try {
      const jwk = JSON.parse(key);
      if (jwk && typeof jwk === 'object' && jwk.kty) {
        k = parseJwk(jwk as JWK);
      }
    } catch {}
    if (!k) {
      k = sshpk.parseKey(key, 'auto');
    }
    const details = getDetails(k);
    (self as any).postMessage({ success: true, details });
  } catch (err: any) {
    (self as any).postMessage({ success: false, error: err.message });
  }
};
