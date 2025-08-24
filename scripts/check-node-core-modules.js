const fs = require('fs');
const path = require('path');
const { builtinModules } = require('module');

const CLIENT_DIR = path.join(__dirname, '..', '.next', 'static');

if (!fs.existsSync(CLIENT_DIR)) {
  console.error('Client build output not found at .next/static. Run `yarn build` first.');
  process.exit(1);
}

function getJsFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const res = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...getJsFiles(res));
    else if (res.endsWith('.js')) files.push(res);
  }
  return files;
}

const jsFiles = getJsFiles(CLIENT_DIR);
const coreModules = Array.from(new Set(
  builtinModules
    .map((m) => m.replace(/^node:/, '').split('/')[0])
    .filter((m) => !m.startsWith('_') && m !== 'buffer' && m !== 'process')
));

for (const file of jsFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const mod of coreModules) {
    const pattern = new RegExp(`['\"]${mod}['\"]`);
    if (pattern.test(content)) {
      console.error(`Node core module \"${mod}\" found in client bundle: ${path.relative(process.cwd(), file)}`);
      process.exit(1);
    }
  }
}

console.log('No Node core modules found in client bundles.');
