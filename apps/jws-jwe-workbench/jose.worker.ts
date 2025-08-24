import {
  generateKeyPair,
  exportPKCS8,
  exportSPKI,
  exportJWK,
  CompactEncrypt,
  compactDecrypt,
  CompactSign,
  compactVerify,
  GeneralSign,
  generalVerify,
  importJWK,
  importPKCS8,
  importSPKI,
} from 'jose';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let rsaPrivateKey: CryptoKey;
let rsaPublicKey: CryptoKey;
let ecPrivateKey: CryptoKey;
let ecPublicKey: CryptoKey;

(async () => {
  const rsa = await generateKeyPair('RS256');
  rsaPrivateKey = rsa.privateKey;
  rsaPublicKey = rsa.publicKey;
  const rsaPrivatePem = await exportPKCS8(rsaPrivateKey);
  const rsaPublicPem = await exportSPKI(rsaPublicKey);
  const rsaPrivateJwk = await exportJWK(rsaPrivateKey);
  const rsaPublicJwk = await exportJWK(rsaPublicKey);

  const ec = await generateKeyPair('ES256');
  ecPrivateKey = ec.privateKey;
  ecPublicKey = ec.publicKey;
  const ecPrivatePem = await exportPKCS8(ecPrivateKey);
  const ecPublicPem = await exportSPKI(ecPublicKey);
  const ecPrivateJwk = await exportJWK(ecPrivateKey);
  const ecPublicJwk = await exportJWK(ecPublicKey);

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
  const {
    id,
    action,
    payload,
    token,
    key,
    alg,
    enc,
    kid,
    detached,
    multi,
    direction,
    header,
    aad,
  } = e.data as any;
  if (id === 'init') return;
  try {
    let result: any;
    if (action === 'sign') {
      if (multi) {
        const payloadBytes = encoder.encode(JSON.stringify(payload));
        const signer = new GeneralSign(payloadBytes);
        const rsaHeader: any = { alg: 'RS256', kid: 'rsa' };
        const ecHeader: any = { alg: 'ES256', kid: 'ec' };
        if (detached) {
          rsaHeader.b64 = false;
          rsaHeader.crit = ['b64'];
          ecHeader.b64 = false;
          ecHeader.crit = ['b64'];
        }
        signer.addSignature(rsaPrivateKey).setProtectedHeader(rsaHeader);
        signer.addSignature(ecPrivateKey).setProtectedHeader(ecHeader);
        const obj = await signer.sign();
        if (detached) delete (obj as any).payload;
        result = obj;
      } else {
        const cryptoKey = await parseKey(key, 'private', alg);
        const hdr: any = { ...(header || {}), alg, kid };
        if (detached) {
          hdr.b64 = false;
          hdr.crit = ['b64'];
        }
        let jws = await new CompactSign(
          encoder.encode(JSON.stringify(payload)),
        )
          .setProtectedHeader(hdr)
          .sign(cryptoKey);
        if (detached) {
          const parts = jws.split('.');
          parts[1] = '';
          jws = parts.join('.');
        }
        result = jws;
      }
    } else if (action === 'verify') {
      if (token.trim().startsWith('{')) {
        const obj = typeof token === 'string' ? JSON.parse(token) : token;
        const payloadBytes = detached
          ? encoder.encode(JSON.stringify(payload))
          : undefined;
        const options = detached ? { payload: payloadBytes, crit: ['b64'] } : { payload: payloadBytes };
        const results: any[] = [];
        try {
          const res1 = await generalVerify(obj, rsaPublicKey, options);
          results.push({
            payload: JSON.parse(decoder.decode(res1.payload)),
            header: res1.protectedHeader,
          });
        } catch {}
        try {
          const res2 = await generalVerify(obj, ecPublicKey, options);
          results.push({
            payload: JSON.parse(decoder.decode(res2.payload)),
            header: res2.protectedHeader,
          });
        } catch {}
        result = results;
      } else {
        const cryptoKey = await parseKey(key, 'public', alg);
        const payloadBytes = detached
          ? encoder.encode(JSON.stringify(payload))
          : undefined;
        const options = detached ? { payload: payloadBytes, crit: ['b64'] } : { payload: payloadBytes };
        const { payload: pl, protectedHeader } = await compactVerify(
          token,
          cryptoKey,
          options,
        );
        result = { payload: JSON.parse(decoder.decode(pl)), header: protectedHeader };
      }
    } else if (action === 'encrypt') {
      const cryptoKey = await parseKey(key, 'public', alg);
      const hdr: any = header || { alg, enc, kid };
      const encrypter = new CompactEncrypt(
        encoder.encode(JSON.stringify(payload)),
      ).setProtectedHeader(hdr);
      if (aad) encrypter.setAdditionalAuthenticatedData(encoder.encode(aad));
      const jwe = await encrypter.encrypt(cryptoKey);
      result = jwe;
    } else if (action === 'decrypt') {
      const cryptoKey = await parseKey(key, 'private', alg);
      const options = aad
        ? { additionalAuthenticatedData: encoder.encode(aad) }
        : undefined;
      const { plaintext, protectedHeader } = await compactDecrypt(
        token,
        cryptoKey,
        options,
      );
      result = {
        payload: JSON.parse(decoder.decode(plaintext)),
        header: protectedHeader,
      };
    } else if (action === 'convert') {
      if (direction === 'pem2jwk') {
        const cryptoKey = await parseKey(key, key.includes('PRIVATE') ? 'private' : 'public', alg);
        result = await exportJWK(cryptoKey);
      } else if (direction === 'jwk2pem') {
        const cryptoKey = await parseKey(key, key.includes('"d"') ? 'private' : 'public', alg);
        try {
          result = await exportPKCS8(cryptoKey);
        } catch {
          result = await exportSPKI(cryptoKey);
        }
      } else {
        throw new Error('Unknown conversion direction');
      }
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
