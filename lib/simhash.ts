export default function createSimhash() {
  return (tokens: string[]): number[] => {
    const hashLength = 32;
    const acc = new Array<number>(hashLength).fill(0);
    for (const token of tokens) {
      const h = crc32(token);
      for (let j = 0; j < hashLength; j++) {
        acc[j] += h & (1 << j) ? 1 : -1;
      }
    }
    return acc.map((v) => (v > 0 ? 1 : 0));
  };
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(str: string): number {
  let crc = -1;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    crc = (crc >>> 8) ^ crcTable[(crc ^ code) & 0xff];
  }
  crc = crc ^ -1;
  return crc >>> 0;
}
