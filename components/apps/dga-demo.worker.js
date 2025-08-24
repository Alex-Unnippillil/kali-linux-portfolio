// Simple Web Worker generating domains using toy DGAs
const algorithms = {
  lcg(seed) {
    return (1664525 * seed + 1013904223) >>> 0;
  },
  xorshift(seed) {
    let x = seed >>> 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return x >>> 0;
  },
  mulberry32(seed) {
    let t = (seed += 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  },
};

self.onmessage = (e) => {
  const { seed, length, count, alphabet, algorithm } = e.data;
  const gen = algorithms[algorithm] || algorithms.lcg;
  const domains = [];
  let s = seed >>> 0;
  for (let i = 0; i < count; i++) {
    let name = '';
    for (let j = 0; j < length; j++) {
      s = gen(s);
      name += alphabet[s % alphabet.length];
    }
    domains.push(name + '.com');
  }
  self.postMessage({ domains });
};

