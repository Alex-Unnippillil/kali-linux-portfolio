const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONFIG = path.join(ROOT, 'apps.config.js');
const PUBLIC = path.join(ROOT, 'public');

const content = fs.readFileSync(CONFIG, 'utf8');
const missing = new Set();

// Match direct icon paths: icon: './themes/...'
const iconPathRegex = /icon\s*:\s*['"](\.\/themes\/[^'\"]+)['"]/g;
for (const match of content.matchAll(iconPathRegex)) {
  const rel = match[1].replace(/^\.\//, '');
  const file = path.join(PUBLIC, rel);
  if (!fs.existsSync(file)) {
    missing.add(rel.split(path.sep).join('/'));
  }
}

// Match icon('filename') helper usage
const iconFuncRegex = /icon\(\s*['"]([^'\"]+)['"]\s*\)/g;
for (const match of content.matchAll(iconFuncRegex)) {
  const rel = path.join('themes', 'Yaru', 'apps', match[1]);
  const file = path.join(PUBLIC, rel);
  if (!fs.existsSync(file)) {
    missing.add(rel.split(path.sep).join('/'));
  }
}

if (missing.size) {
  console.error('Missing icon files:');
  for (const m of missing) console.error(` - ${m}`);
  process.exit(1);
}

console.log('All icon files exist.');
