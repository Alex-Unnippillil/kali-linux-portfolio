import {
  generateKeyPair,
  exportPKCS8,
  exportSPKI,
  exportJWK,
  SignJWT,
  jwtVerify,
  CompactEncrypt,
  compactDecrypt,
  importJWK,
  importPKCS8,
  importSPKI,
} from 'jose';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

(async () => {
  const rsa = await generateKeyPair('RS256');
  const rsaPrivatePem = await exportPKCS8(rsa.privateKey);
  const rsaPublicPem = await exportSPKI(rsa.publicKey);
  const rsaPrivateJwk = await exportJWK(rsa.privateKey);
  const rsaPublicJwk = await exportJWK(rsa.publicKey);

  const ec = await generateKeyPair('ES256');
  const ecPrivatePem = await exportPKCS8(ec.privateKey);
  const ecPublicPem = await exportSPKI(ec.publicKey);
  const ecPrivateJwk = await exportJWK(ec.privateKey);
  const ecPublicJwk = await exportJWK(ec.publicKey);

  (self as any).postMessage({
    id: 'init',
    rsa: {
      privatePem: rsaPrivatePem,
      publicPem: rsaPublicPem,
      privateJwk: rsaPrivateJwk,
      publicJwk: rsaPublicJwk,
    },
    ec: {
      privatePem: ecPrivatePem,
      publicPem: ecPublicPem,
      privateJwk: ecPrivateJwk,
      publicJwk: ecPublicJwk,
    },
  });
})();

async function parseKey(
  key: string,
  type: 'private' | 'public',
  alg: string,
): Promise<CryptoKey> {
  const trimmed = key.trim();
  if (trimmed.startsWith('{')) {
    const obj = JSON.parse(trimmed);
    const jwk = 'keys' in obj ? obj.keys[0] : obj;
    if (jwk.kty === 'RSA' && !/^RS|PS|RSA-OAEP/.test(alg)) {
      throw new Error(`Algorithm mismatch: RSA key cannot be used with ${alg}`);
    }
    if (jwk.kty === 'EC' && !/^ES|ECDH/.test(alg)) {
      throw new Error(`Algorithm mismatch: EC key cannot be used with ${alg}`);
    }
    return importJWK(jwk, alg) as Promise<CryptoKey>;
  }
  if (trimmed.includes('BEGIN')) {
    if (/EC PRIVATE|EC PUBLIC/.test(trimmed) && !/^ES|ECDH/.test(alg)) {
      throw new Error(`Algorithm mismatch: EC key cannot be used with ${alg}`);
    }
    if (!/EC/.test(trimmed) && !/^RS|PS|RSA-OAEP/.test(alg)) {
      throw new Error(`Algorithm mismatch: RSA key cannot be used with ${alg}`);
    }
    return type === 'private'
      ? importPKCS8(trimmed, alg)
      : importSPKI(trimmed, alg);
  }
  throw new Error('Unsupported key format');
}

(self as any).onmessage = async (e: MessageEvent) => {
  const { id, action, payload, token, key, alg, enc, kid } = e.data as any;
  if (id === 'init') return;
  try {
    let result: any;
    if (action === 'sign') {
      const cryptoKey = await parseKey(key, 'private', alg);
      result = await new SignJWT(payload)
        .setProtectedHeader({ alg, kid })
        .sign(cryptoKey);
    } else if (action === 'verify') {
      const cryptoKey = await parseKey(key, 'public', alg);
      const { payload: pl, protectedHeader } = await jwtVerify(token, cryptoKey, {
        algorithms: [alg],
      });
      result = { payload: pl, header: protectedHeader };
    } else if (action === 'encrypt') {
      const cryptoKey = await parseKey(key, 'public', alg);
      const jwe = await new CompactEncrypt(
        encoder.encode(JSON.stringify(payload)),
      )
        .setProtectedHeader({ alg, enc, kid })
        .encrypt(cryptoKey);
      result = jwe;
    } else if (action === 'decrypt') {
      const cryptoKey = await parseKey(key, 'private', alg);
      const { plaintext, protectedHeader } = await compactDecrypt(
        token,
        cryptoKey,
      );
      result = {
        payload: JSON.parse(decoder.decode(plaintext)),
        header: protectedHeader,
      };
    } else {
      throw new Error('Unknown action');
    }
    (self as any).postMessage({ id, result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (self as any).postMessage({ id, error: msg });
  }
};

export default null as any;
