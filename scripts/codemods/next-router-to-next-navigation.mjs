#!/usr/bin/env node
import fs from 'fs';
import fg from 'fast-glob';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const check = args.includes('--check');

const files = await fg([
  '**/*.{js,jsx,ts,tsx}',
  '!node_modules/**',
  '!.next/**',
  '!dist/**',
  '!.yarn/**',
  '!scripts/codemods/**'
]);

let changed = false;
for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  if (code.includes("from 'next/router'")) {
    changed = true;
    if (apply) {
      const updated = code.replace(/from 'next\/router'/g, "from 'next/navigation'");
      fs.writeFileSync(file, updated);
      console.log(`updated ${file}`);
    }
  }
}

if (check && changed) {
  console.error('Found deprecated next/router imports. Run yarn codemod:next-router to fix.');
  process.exit(1);
}
