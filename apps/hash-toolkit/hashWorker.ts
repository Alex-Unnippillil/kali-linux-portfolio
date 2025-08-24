import CryptoJS from 'crypto-js';
import ssdeep from 'ssdeep.js';
import tlsh from 'tlsh';
import createSimhash from '@lib/simhash';

const simhash = createSimhash();

function bitsToHex(bits: number[]): string {
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    hex += ((bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3]).toString(16);
  }
  return hex;
}

export {};

let cancelled = false;

self.onmessage = async (
  e: MessageEvent<{ type: 'hash'; file: File } | { type: 'cancel' }>
) => {
  if (e.data.type === 'cancel') {
    cancelled = true;
    return;
  }
  const { file } = e.data;
  cancelled = false;
  try {
    const chunkSize = 64 * 1024;
    const md5 = CryptoJS.algo.MD5.create();
    const sha1 = CryptoJS.algo.SHA1.create();
    const sha256 = CryptoJS.algo.SHA256.create();
    const sha512 = CryptoJS.algo.SHA512.create();
    const total = new Uint8Array(file.size);
    let offset = 0;
    while (offset < file.size) {
      if (cancelled) {
        // @ts-ignore
        self.postMessage({ type: 'cancelled' });
        return;
      }
      const slice = file.slice(offset, offset + chunkSize);
      const buffer = await slice.arrayBuffer();
      const wordArray = CryptoJS.lib.WordArray.create(buffer);
      md5.update(wordArray);
      sha1.update(wordArray);
      sha256.update(wordArray);
      sha512.update(wordArray);
      total.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
      // @ts-ignore
      self.postMessage({ type: 'progress', progress: offset / file.size });
    }
    // Build binary string for tlsh
    let bin = '';
    for (let i = 0; i < total.length; i += 65536) {
      bin += String.fromCharCode(...total.slice(i, i + 65536));
    }
    let tlshHash = '';
    try {
      tlshHash = tlsh(bin);
    } catch {}
    const tokens = Array.from(total).map((b) => b.toString());
    const simhashHex = bitsToHex(simhash(tokens));
    const hashes = {
      md5: md5.finalize().toString(),
      sha1: sha1.finalize().toString(),
      sha256: sha256.finalize().toString(),
      sha512: sha512.finalize().toString(),
      ssdeep: ssdeep.digest(total as any),
      tlsh: tlshHash,
      simhash: simhashHex,
    };
    // @ts-ignore
    self.postMessage({ type: 'result', hashes });
  } catch (err) {
    // @ts-ignore
    self.postMessage({ type: 'error', error: 'File read error' });
  }
};
