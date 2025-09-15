import fs from 'fs/promises';
import path from 'path';

async function main() {
  const statsPath = path.join('.next', 'analyze', 'client-stats.json');
  try {
    const raw = await fs.readFile(statsPath, 'utf8');
    const stats = JSON.parse(raw);
    const modules = (stats.modules || [])
      .map((m) => ({ name: m.name, size: m.size }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 20);
    console.log('Top modules by size (KB):');
    for (const mod of modules) {
      console.log(`${(mod.size / 1024).toFixed(2)}\t${mod.name}`);
    }
  } catch (err) {
    console.error('Failed to read bundle stats', err);
    process.exit(1);
  }
}

main();
