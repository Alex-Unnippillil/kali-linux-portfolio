import { createMD5, createSHA1 } from 'hash-wasm';

describe('hash-wasm algorithms', () => {
  it('computes MD5 and SHA-1 for sample entries', async () => {
    const samples: Record<string, { md5: string; sha1: string }> = {
      hello: {
        md5: '5d41402abc4b2a76b9719d911017c592',
        sha1: 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d',
      },
      world: {
        md5: '7d793037a0760186574b0282f2f435e7',
        sha1: '7c211433f02071597741e6ff5a8ea34789abbf43',
      },
    };

    const md5 = await createMD5();
    const sha1 = await createSHA1();

    for (const [text, expected] of Object.entries(samples)) {
      md5.init();
      md5.update(text);
      const md5Result = md5.digest('hex');

      sha1.init();
      sha1.update(text);
      const sha1Result = sha1.digest('hex');

      expect(md5Result).toBe(expected.md5);
      expect(sha1Result).toBe(expected.sha1);
    }
  });
});
