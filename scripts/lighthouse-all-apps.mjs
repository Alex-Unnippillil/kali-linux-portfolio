import fs from 'fs';
import path from 'path';
import lighthouse from 'lighthouse';
import {launch} from 'chrome-launcher';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const reportsDir = path.join(process.cwd(), 'lighthouse-reports');
fs.mkdirSync(reportsDir, {recursive: true});

const pagesDir = path.join(process.cwd(), 'pages', 'apps');
const files = fs.readdirSync(pagesDir, {withFileTypes: true})
  .filter((d) => d.isFile() && /\.(jsx?|tsx?)$/.test(d.name))
  .map((d) => d.name.replace(/\.(jsx?|tsx?)$/, ''));

const routes = ['/', '/apps', ...files.map((f) => `/apps/${f}`)];

(async () => {
  const chrome = await launch({chromeFlags: ['--headless', '--no-sandbox']});
  const opts = {port: chrome.port, output: ['html', 'json'], onlyCategories: ['accessibility']};
  let failed = false;

  for (const route of routes) {
    const url = `${BASE_URL}${route}`;
    const result = await lighthouse(url, opts);
    const score = result.lhr.categories.accessibility.score * 100;
    const fileBase = route === '/' ? 'index' : route.slice(1).replace(/\//g, '_');
    fs.writeFileSync(path.join(reportsDir, `${fileBase}.html`), result.report[0]);
    fs.writeFileSync(path.join(reportsDir, `${fileBase}.json`), result.report[1]);
    console.log(`${route}: ${score}`);
    if (score < 95) {
      failed = true;
    }
  }

  await chrome.kill();
  if (failed) process.exit(1);
})();
