import pHash from 'phash-js';

export {};

const FNV_OFFSET_BASIS = BigInt('0xcbf29ce484222325');
const FNV_PRIME = BigInt('0x100000001b3');

function fnv1a64(str: string): bigint {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * FNV_PRIME) & BigInt('0xffffffffffffffff');
  }
  return hash;
}

async function getImageData(file: File, w: number, h: number): Promise<ImageData> {
  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unsupported');
  ctx.drawImage(bitmap, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

function averageHash(data: ImageData): string {
  const gray: number[] = [];
  let sum = 0;
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 0.299 * data.data[i] + 0.587 * data.data[i + 1] + 0.114 * data.data[i + 2];
    gray.push(v);
    sum += v;
  }
  const avg = sum / gray.length;
  let hash = 0n;
  for (let i = 0; i < gray.length; i += 1) {
    if (gray[i] >= avg) hash |= 1n << BigInt(63 - i);
  }
  return hash.toString(16).padStart(16, '0');
}

function differenceHash(data: ImageData): string {
  let hash = 0n;
  for (let y = 0; y < data.height; y += 1) {
    for (let x = 0; x < data.width - 1; x += 1) {
      const idx1 = (y * data.width + x) * 4;
      const idx2 = idx1 + 4;
      const g1 = 0.299 * data.data[idx1] + 0.587 * data.data[idx1 + 1] + 0.114 * data.data[idx1 + 2];
      const g2 = 0.299 * data.data[idx2] + 0.587 * data.data[idx2 + 1] + 0.114 * data.data[idx2 + 2];
      const bit = g1 > g2 ? 1n : 0n;
      const pos = BigInt(63 - (y * (data.width - 1) + x));
      hash |= bit << pos;
    }
  }
  return hash.toString(16).padStart(16, '0');
}

function simHash(data: ImageData): string {
  const bits = Array(64).fill(0);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 0.299 * data.data[i] + 0.587 * data.data[i + 1] + 0.114 * data.data[i + 2];
    const token = (i / 4).toString();
    const h = fnv1a64(token);
    for (let b = 0; b < 64; b += 1) {
      const bit = Number((h >> BigInt(b)) & 1n);
      bits[b] += bit ? v : -v;
    }
  }
  let hash = 0n;
  for (let i = 0; i < 64; i += 1) {
    if (bits[i] > 0) hash |= 1n << BigInt(i);
  }
  return hash.toString(16).padStart(16, '0');
}

function hamming(a: string, b: string): number {
  let x = BigInt('0x' + a) ^ BigInt('0x' + b);
  let dist = 0;
  while (x !== 0n) {
    dist += 1;
    x &= x - 1n;
  }
  return dist;
}

async function diffOverlay(fileA: File, fileB: File) {
  const size = 256;
  const a = await getImageData(fileA, size, size);
  const b = await getImageData(fileB, size, size);
  const diff = new Uint8ClampedArray(a.data.length);
  for (let i = 0; i < a.data.length; i += 4) {
    const dr = Math.abs(a.data[i] - b.data[i]);
    const dg = Math.abs(a.data[i + 1] - b.data[i + 1]);
    const db = Math.abs(a.data[i + 2] - b.data[i + 2]);
    const d = (dr + dg + db) / 3;
    diff[i] = 255;
    diff[i + 1] = 0;
    diff[i + 2] = 0;
    diff[i + 3] = d;
  }
  return { width: size, height: size, data: diff.buffer };
}

async function computeAll(file: File) {
  const [a8, d9, s16] = await Promise.all([
    getImageData(file, 8, 8),
    getImageData(file, 9, 8),
    getImageData(file, 16, 16),
  ]);
  const [aHash, dHash, sim] = [averageHash(a8), differenceHash(d9), simHash(s16)];
  const p = await pHash.hash(file);
  return { aHash, dHash, pHash: p.toHex(), simHash: sim };
}

self.onmessage = async (e: MessageEvent<{ fileA: File; fileB: File }>) => {
  const { fileA, fileB } = e.data;
  try {
    const [hashesA, hashesB, diff] = await Promise.all([
      computeAll(fileA),
      computeAll(fileB),
      diffOverlay(fileA, fileB),
    ]);
    const distances = {
      aHash: hamming(hashesA.aHash, hashesB.aHash),
      dHash: hamming(hashesA.dHash, hashesB.dHash),
      pHash: hamming(hashesA.pHash, hashesB.pHash),
      simHash: hamming(hashesA.simHash, hashesB.simHash),
    };
    // @ts-ignore
    self.postMessage({ hashesA, hashesB, distances, diff }, [diff.data]);
  } catch (err) {
    // @ts-ignore
    self.postMessage({ error: (err as Error).message });
  }
};

