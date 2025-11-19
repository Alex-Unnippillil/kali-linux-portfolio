import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'apps.config.js');
const outputPath = path.join(process.cwd(), 'playwright', 'app-routes.json');

const fileContents = fs.readFileSync(configPath, 'utf8');
const idPattern = /id:\s*['"]([^'"\s]+)['"]/g;
const seen = new Set();
const ids = [];

for (const match of fileContents.matchAll(idPattern)) {
  const id = match[1];
  if (!seen.has(id)) {
    seen.add(id);
    ids.push(id);
  }
}

if (ids.length === 0) {
  throw new Error('No app identifiers found in apps.config.js');
}

const routes = ids.map((id) => `/apps/${id}`);

fs.writeFileSync(outputPath, JSON.stringify(routes, null, 2));

console.log(`Generated ${routes.length} app routes at ${outputPath}`);
