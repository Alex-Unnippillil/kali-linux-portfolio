export type RNG = () => number;

export const mulberry32 = (a: number): RNG => {
  let t = a >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

export const createRng = (seed?: number): RNG => {
  if (typeof seed === 'number') return mulberry32(seed);
  return Math.random;
};
