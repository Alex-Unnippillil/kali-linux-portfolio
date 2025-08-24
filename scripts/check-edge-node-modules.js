const fs = require('fs');
const path = require('path');
const { builtinModules } = require('module');

const ROOT_DIR = path.join(__dirname, '..');
const APP_DIR = path.join(ROOT_DIR, 'app');

if (!fs.existsSync(APP_DIR)) {
  console.error('App directory not found.');
  process.exit(1);
}

function getAllFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const res = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(res));
    } else {
      files.push(res);
    }
  }
  return files;
}

const candidateFiles = getAllFiles(APP_DIR).filter((file) =>
  /(page|route)\.(js|jsx|ts|tsx)$/.test(file)
);

const coreModules = new Set(
  builtinModules
    .map((m) => m.replace(/^node:/, '').split('/')[0])
    .filter((m) => !m.startsWith('_') && m !== 'buffer' && m !== 'process')
);

let hasError = false;

for (const file of candidateFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (!/runtime\s*=\s*['"]edge['"]/.test(content)) continue;

  const importRegex = /import[^'"\n]*['"]([^'"\n]+)['"]/g;
  const fromRegex = /from\s+['"]([^'"\n]+)['"]/g;
  const requireRegex = /require\(\s*['"]([^'"\n]+)['"]\s*\)/g;
  const dynamicImportRegex = /import\(\s*['"]([^'"\n]+)['"]\s*\)/g;

  const modules = new Set();
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    modules.add(match[1]);
  }
  while ((match = fromRegex.exec(content)) !== null) {
    modules.add(match[1]);
  }
  while ((match = requireRegex.exec(content)) !== null) {
    modules.add(match[1]);
  }
  while ((match = dynamicImportRegex.exec(content)) !== null) {
    modules.add(match[1]);
  }

  for (const mod of modules) {
    const normalized = mod.replace(/^node:/, '').split('/')[0];
    if (coreModules.has(normalized)) {
      console.error(
        `Node core module "${normalized}" imported in edge runtime file: ${path.relative(ROOT_DIR, file)}`
      );
      hasError = true;
    }
  }
}

if (hasError) {
  process.exit(1);
}

console.log('No Node core modules imported in edge runtime pages or routes.');
