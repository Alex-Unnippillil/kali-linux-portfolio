import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

async function hashFile(filePath) {
  const data = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const res = path.resolve(dir, entry.name);
      if (entry.isDirectory()) {
        return walk(res);
      }
      return [res];
    })
  );
  return files.flat();
}

async function findDuplicates(root) {
  const files = await walk(root);
  const hashes = new Map();

  for (const file of files) {
    const hash = await hashFile(file);
    if (!hashes.has(hash)) {
      hashes.set(hash, []);
    }
    hashes.get(hash).push(file);
  }

  const duplicates = Array.from(hashes.values()).filter((list) => list.length > 1);
  if (duplicates.length === 0) {
    console.log('No duplicate images found');
    return;
  }
  console.log('Duplicate images found:');
  for (const group of duplicates) {
    console.log(group.join('\n'));
    console.log('');
  }
}

findDuplicates(path.resolve('public/images')).catch((err) => {
  console.error(err);
  process.exit(1);
});
