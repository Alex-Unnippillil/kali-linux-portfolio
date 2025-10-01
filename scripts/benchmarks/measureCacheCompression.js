const { encodeCacheValueSync, decodeCacheValueSync } = require('./.tmp/cache-stats/utils/cacheCompression.js');
const { performance } = require('perf_hooks');
const { writeFileSync } = require('fs');

function generateSample(size) {
  const items = [];
  for (let i = 0; i < size; i += 1) {
    items.push({
      id: i,
      msg: 'x'.repeat(64),
      nested: { a: i % 5, b: `host-${i % 512}` },
    });
  }
  return items;
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * (sorted.length - 1))));
  return sorted[rank];
}

const sample = generateSample(20000);
const raw = JSON.stringify(sample);
const record = encodeCacheValueSync(sample);

const iterations = 20;
const warmup = 3;
const parseTimes = [];
const decodeTimes = [];
for (let i = 0; i < iterations; i += 1) {
  const start = performance.now();
  JSON.parse(raw);
  const end = performance.now();
  if (i >= warmup) parseTimes.push(end - start);
}
for (let i = 0; i < iterations; i += 1) {
  const start = performance.now();
  decodeCacheValueSync(record);
  const end = performance.now();
  if (i >= warmup) decodeTimes.push(end - start);
}
const parseP95 = percentile(parseTimes, 95);
const decodeP95 = percentile(decodeTimes, 95);
const summary = {
  originalBytes: record.originalSize,
  compressedBytes: record.compressedSize,
  compressionRatio: record.compressedSize / record.originalSize,
  parseP95,
  decodeP95,
  overhead: ((decodeP95 - parseP95) / parseP95) * 100,
  iterations: iterations - warmup,
};
console.log(JSON.stringify(summary, null, 2));
writeFileSync('compression-stats.json', JSON.stringify(summary, null, 2));
