import CryptoJS from 'crypto-js';
import ssdeep from 'ssdeep.js';

export {};


self.onmessage = async (e: MessageEvent<File>) => {
  const file = e.data;
  try {
    const chunkSize = 64 * 1024;
    const md5 = CryptoJS.algo.MD5.create();
    const sha1 = CryptoJS.algo.SHA1.create();
    const sha256 = CryptoJS.algo.SHA256.create();
    const total = new Uint8Array(file.size);
    let offset = 0;
    while (offset < file.size) {
      const slice = file.slice(offset, offset + chunkSize);
      const buffer = await slice.arrayBuffer();
      const wordArray = CryptoJS.lib.WordArray.create(buffer);
      md5.update(wordArray);
      sha1.update(wordArray);
      sha256.update(wordArray);
      total.set(new Uint8Array(buffer), offset);
      offset += chunkSize;
    }
    const hashes = {
      md5: md5.finalize().toString(),
      sha1: sha1.finalize().toString(),
      sha256: sha256.finalize().toString(),
      ssdeep: ssdeep.digest(total as any),
    };
    // @ts-ignore
    self.postMessage(hashes);
  } catch (err) {
    // @ts-ignore
    self.postMessage({ error: 'File read error' });
  }
};
