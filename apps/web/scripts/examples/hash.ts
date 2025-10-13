import { createMD5, createSHA1 } from 'hash-wasm';

export async function hashExample() {
  const samples = ['hello', 'world'];
  const md5 = await createMD5();
  const sha1 = await createSHA1();

  for (const text of samples) {
    md5.init();
    md5.update(text);
    const md5Digest = md5.digest('hex');

    sha1.init();
    sha1.update(text);
    const sha1Digest = sha1.digest('hex');

    console.log(`${text}: MD5=${md5Digest} SHA-1=${sha1Digest}`);
  }
}

hashExample();
