#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import fg from 'fast-glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

const criticalOutputDir = path.join(projectRoot, '.next', 'cache', 'critical-css');

const COMMON_GLOBS = [
  'components/ubuntu.{js,jsx,ts,tsx}',
  'components/screen/**/*.{js,jsx,ts,tsx}',
  'components/base/**/*.{js,jsx,ts,tsx}',
  'components/context-menus/**/*.{js,jsx,ts,tsx}',
  'components/menu/**/*.{js,jsx,ts,tsx}',
  'components/common/**/*.{js,jsx,ts,tsx}',
];

const ROUTES = [
  {
    key: 'home',
    include: [
      ...COMMON_GLOBS,
      'pages/index.jsx',
      'components/BetaBadge.{js,jsx,ts,tsx}',
      'components/InstallButton.{js,jsx,ts,tsx}',
    ],
  },
  {
    key: 'desktop',
    include: [
      ...COMMON_GLOBS,
      'pages/apps/index.jsx',
    ],
  },
];

const CLASSNAME_REGEX = /className\s*=\s*("[^"]*"|'[^']*'|`[^`]*`|{[^}]*})/g;
const STRING_REGEX = /"([^"]+)"|'([^']+)'|`([^`]+)`/g;

async function collectClasses(patterns) {
  const files = await fg(patterns, { cwd: projectRoot, onlyFiles: true, dot: false, unique: true });
  const classNames = new Set();

  for (const file of files) {
    const absolute = path.join(projectRoot, file);
    const content = await fs.readFile(absolute, 'utf8');
    let match;
    while ((match = CLASSNAME_REGEX.exec(content))) {
      const candidate = match[1];
      if (!candidate) continue;
      let stringMatch;
      while ((stringMatch = STRING_REGEX.exec(candidate))) {
        const value = stringMatch[1] || stringMatch[2] || stringMatch[3] || '';
        value
          .split(/\s+/)
          .map((token) => token.trim())
          .filter((token) => token && !token.includes('${') && !token.startsWith('{'))
          .forEach((token) => classNames.add(token));
      }
    }
  }

  return classNames;
}

function createTempFile(name, content) {
  const filePath = path.join(os.tmpdir(), `critical-css-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
  return fs.writeFile(filePath, content, 'utf8').then(() => filePath);
}

async function runTailwind(inputPath, contentPath, outputPath) {
  const tailwindBin = path.join(projectRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'tailwindcss.cmd' : 'tailwindcss');
  await new Promise((resolve, reject) => {
    const child = spawn(tailwindBin, ['-i', inputPath, '-o', outputPath, '--content', contentPath, '--config', path.join(projectRoot, 'tailwind.config.js'), '--minify'], {
      cwd: projectRoot,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`tailwindcss exited with code ${code}`));
    });
  });
}

async function buildCriticalCss() {
  if (process.env.NODE_ENV && process.env.NODE_ENV !== 'production') {
    console.log('[critical-css] Skipping critical CSS build outside production mode.');
    return;
  }

  await fs.mkdir(criticalOutputDir, { recursive: true });

  const tokensCss = await fs.readFile(path.join(projectRoot, 'styles', 'tokens.css'), 'utf8');
  const globalsCss = await fs
    .readFile(path.join(projectRoot, 'styles', 'globals.css'), 'utf8')
    .then((css) => css.replace(/@import\s+['\"]\.\/tokens\.css['\"];?/, '').trim());
  const indexCss = await fs
    .readFile(path.join(projectRoot, 'styles', 'index.css'), 'utf8')
    .then((css) => css.replace(/@import\s+['\"]\.\/globals\.css['\"];?/, '').trim());

  const baseCss = [tokensCss.trim(), globalsCss, indexCss].filter(Boolean).join('\n\n');

  for (const route of ROUTES) {
    const classNames = await collectClasses(route.include);
    if (classNames.size === 0) {
      console.warn(`[critical-css] No class names found for route "${route.key}". Skipping.`);
      continue;
    }

    const tempHtml = Array.from(classNames)
      .map((cls) => `<div class="${cls.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}"></div>`)
      .join('\n');
    const tempCssInput = '@tailwind base;\n@tailwind components;\n@tailwind utilities;';

    const contentPath = await createTempFile(`${route.key}-content.html`, tempHtml);
    const inputPath = await createTempFile(`${route.key}-input.css`, tempCssInput);
    const outputPath = path.join(os.tmpdir(), `critical-css-${route.key}-${Date.now()}.css`);

    try {
      await runTailwind(inputPath, contentPath, outputPath);
      const tailwindCss = await fs.readFile(outputPath, 'utf8');
      const finalCss = [baseCss, tailwindCss.trim()].filter(Boolean).join('\n\n');
      const destination = path.join(criticalOutputDir, `${route.key}.css`);
      await fs.writeFile(destination, finalCss, 'utf8');
      console.log(`[critical-css] Wrote ${route.key} critical CSS to ${destination}`);
    } finally {
      await Promise.allSettled([
        fs.unlink(contentPath).catch(() => {}),
        fs.unlink(inputPath).catch(() => {}),
        fs.unlink(outputPath).catch(() => {}),
      ]);
    }
  }
}

buildCriticalCss().catch((error) => {
  console.error('[critical-css] Failed to build critical CSS');
  console.error(error);
  process.exitCode = 1;
});
