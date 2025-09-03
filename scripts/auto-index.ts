import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

interface QueryStat {
  collection: string;
  fields: string[];
  count: number;
}

interface IndexSuggestion {
  collection: string;
  fields: string[];
}

const STATS_FILE = process.argv[2] ?? path.join(process.cwd(), 'data', 'query-stats.json');
const INDEX_FILE = path.join(process.cwd(), 'scripts', 'client-index.json');
const ROLLBACK_DIR = path.join(process.cwd(), 'scripts', 'rollback');

async function loadJSON<T>(file: string): Promise<T | null> {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

function analyzeQueryStats(stats: QueryStat[]): IndexSuggestion[] {
  const collections: Record<string, Record<string, number>> = {};

  for (const stat of stats) {
    if (!collections[stat.collection]) collections[stat.collection] = {};
    const coll = collections[stat.collection];
    for (const field of stat.fields) {
      coll[field] = (coll[field] ?? 0) + stat.count;
    }
  }

  const suggestions: IndexSuggestion[] = [];
  for (const [collection, fields] of Object.entries(collections)) {
    for (const [field, count] of Object.entries(fields)) {
      if (count > 100) {
        suggestions.push({ collection, fields: [field] });
      }
    }
  }

  return suggestions;
}

async function confirm(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

async function applySuggestions(suggestions: IndexSuggestion[]): Promise<void> {
  const existing = (await loadJSON<IndexSuggestion[]>(INDEX_FILE)) ?? [];
  await fs.mkdir(ROLLBACK_DIR, { recursive: true });
  const rollbackFile = path.join(
    ROLLBACK_DIR,
    `client-index.rollback.${Date.now()}.json`
  );
  await fs.writeFile(rollbackFile, JSON.stringify(existing, null, 2));

  const merged = [...existing];
  for (const s of suggestions) {
    if (!merged.some((m) => m.collection === s.collection && m.fields.join(',') === s.fields.join(','))) {
      merged.push(s);
    }
  }

  await fs.writeFile(INDEX_FILE, JSON.stringify(merged, null, 2));
  console.log(`Applied suggestions. Rollback saved to ${rollbackFile}`);
}

async function main() {
  const stats = (await loadJSON<QueryStat[]>(STATS_FILE)) ?? [];
  if (stats.length === 0) {
    console.error('No query stats found');
    return;
  }

  const suggestions = analyzeQueryStats(stats);
  if (suggestions.length === 0) {
    console.log('No index suggestions generated');
    return;
  }

  console.log('Index suggestions:', suggestions);

  if (process.env.ENABLE_AUTO_INDEX !== 'true') {
    console.log('Feature flag disabled. Exiting without applying.');
    return;
  }

  const ok = await confirm('Apply suggestions to client search index? (y/N) ');
  if (!ok) {
    console.log('Aborted by user');
    return;
  }

  await applySuggestions(suggestions);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

