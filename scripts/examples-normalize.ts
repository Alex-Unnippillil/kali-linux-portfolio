import fs from 'node:fs';
import fg from 'fast-glob';

const files = fg.sync(['docs/**/*.md']);
let hadError = false;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.trim().startsWith('```')) {
      const parts = line.trim().split(/\s+/);
      if (parts[0] === '```') return; // closing fence
      const lang = parts[0].slice(3);
      const hasLang = lang.length > 0;
      const hasCopy = parts.includes('copy');
      if (!hasLang) {
        console.error(`${file}:${idx + 1} missing language in code block`);
        hadError = true;
      }
      if (!hasCopy) {
        console.error(`${file}:${idx + 1} missing copy flag in code block`);
        hadError = true;
      }
    }
  });
}

if (hadError) {
  process.exit(1);
}
