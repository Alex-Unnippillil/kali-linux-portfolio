import { writeFileSync } from 'fs';
import { performance } from 'perf_hooks';
import { encodeCacheValue, decodeCacheValue } from '../utils/cacheCompression';

function generateSample(size: number) {
  const items: Array<Record<string, unknown>> = [];
  for (let i = 0; i < size; i += 1) {
    items.push({
      id: i,
      host: `host-${i % 512}`,
      severity: ['low', 'medium', 'high', 'critical'][i % 4],
      message: `Finding ${i} ${'='.repeat(32)} details ${'#'.repeat(i % 16)}`,
      vector: Array.from({ length: 8 }, (_, j) => ((i + 1) * (j + 1)) % 97),
      notes: {
        remediation: `Patch package-${i % 50}`,
        evidence: `CVE-${2000 + (i % 24)}-${1000 + i}`,
      },
    });
  }
  return items;
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * (sorted.length - 1))));
  return sorted[rank];
}

async function main() {
  const sample = generateSample(60000);
  const raw = JSON.stringify(sample);
  const record = await encodeCacheValue(sample);

  const ratio = record.compressedSize / record.originalSize;
  const iterations = 40;
  const warmup = 5;
  const parseDurations: number[] = [];
  const decompressDurations: number[] = [];

  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now();
    JSON.parse(raw);
    const end = performance.now();
    if (i >= warmup) parseDurations.push(end - start);
  }

  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now();
    await decodeCacheValue(record);
    const end = performance.now();
    if (i >= warmup) decompressDurations.push(end - start);
  }

  const parseP95 = percentile(parseDurations, 95);
  const decompressP95 = percentile(decompressDurations, 95);
  const overhead = ((decompressP95 - parseP95) / parseP95) * 100;

  console.log('compression stats ready');
  const summary = {
    originalBytes: record.originalSize,
    compressedBytes: record.compressedSize,
    compressionRatio: ratio,
    parseP95,
    decompressP95,
    overhead,
    iterations: iterations - warmup,
  };
  console.log(JSON.stringify(summary, null, 2));
  writeFileSync('compression-stats.json', JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
