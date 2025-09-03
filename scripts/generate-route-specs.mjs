import fs from 'fs';
import path from 'path';

const pagesDir = path.join(process.cwd(), 'pages');
const outDir = path.join(process.cwd(), 'tests', 'generated');

const skipDirNames = new Set(['api', 'admin']); // skip entire directories
const skipRoutes = new Set(['/profile']); // individual routes to skip

/** Recursively collect Next.js routes from the pages directory */
function collectRoutes(dir, baseRoute = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const routes = [];

  for (const entry of entries) {
    if (entry.name.startsWith('_')) continue; // skip _app, _document, etc.

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skipDirNames.has(entry.name)) continue;
      routes.push(...collectRoutes(fullPath, baseRoute + '/' + entry.name));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (!['.js', '.jsx', '.ts', '.tsx'].includes(ext)) continue;

      let routeName = entry.name.slice(0, -ext.length);
      let route = baseRoute + '/' + routeName;
      if (routeName === 'index') {
        route = baseRoute || '/';
      }
      if (route.includes('[')) continue; // skip dynamic routes
      if (skipRoutes.has(route)) continue; // skip auth routes

      routes.push(route);
    }
  }

  return routes;
}

function routeToFile(route) {
  if (route === '/') return 'index.spec.ts';
  return route.slice(1).replace(/\//g, '_') + '.spec.ts';
}

function generateSpec(route) {
  return `import { test, expect } from '@playwright/test';

test('navigate to ${route}', async ({ page }) => {
  await page.goto('${route}');
  await expect(page.getByRole('heading')).toBeVisible();
});\n`;
}

function main() {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const routes = collectRoutes(pagesDir).sort();
  for (const route of routes) {
    const file = routeToFile(route);
    const filePath = path.join(outDir, file);
    fs.writeFileSync(filePath, generateSpec(route));
  }
}

main();
