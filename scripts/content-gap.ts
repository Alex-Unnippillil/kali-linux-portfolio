import fs from 'fs';
import path from 'path';

interface SearchLogEntry {
  query: string;
  results?: number;
  nbHits?: number;
  totalHits?: number;
  hits?: number;
}

function getHitCount(entry: SearchLogEntry): number {
  return (
    entry.results ??
    entry.nbHits ??
    entry.totalHits ??
    entry.hits ??
    0
  );
}

function estimateEffort(query: string): string {
  const words = query.trim().split(/\s+/).length;
  if (words <= 2) return 'low';
  if (words <= 4) return 'medium';
  return 'high';
}

function priorityReason(count: number): string {
  return count > 5 ? 'high search volume' : 'no search results';
}

function toCsvValue(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

async function main() {
  const [,, inputPath = 'data/search-logs.json', outputDir = 'data/content-gaps'] = process.argv;
  const raw = fs.readFileSync(inputPath, 'utf8');
  const entries: SearchLogEntry[] = JSON.parse(raw);

  const gapMap = new Map<string, number>();
  for (const entry of entries) {
    const hits = getHitCount(entry);
    if (hits === 0) {
      const q = entry.query.trim();
      gapMap.set(q, (gapMap.get(q) ?? 0) + 1);
    }
  }

  const rows = [['query', 'priorityReason', 'estimatedEffort']];
  for (const [query, count] of gapMap) {
    rows.push([
      query,
      priorityReason(count),
      estimateEffort(query),
    ]);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const csv = rows.map((row) => row.map(toCsvValue).join(',')).join('\n');
  const outputPath = path.join(outputDir, 'content-gaps.csv');
  fs.writeFileSync(outputPath, csv);
  console.log(`Wrote ${rows.length - 1} rows to ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
