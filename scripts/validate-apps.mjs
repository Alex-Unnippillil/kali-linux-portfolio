import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';

const root = process.cwd();
const configPath = path.join(root, 'apps.config.js');
const config = fs.readFileSync(configPath, 'utf8');

const exts = ['js','jsx','ts','tsx','mjs','cjs'];

function hasModule(base) {
  if (exts.some((ext) => fs.existsSync(`${base}.${ext}`))) return true;
  if (fs.existsSync(base)) {
    const stat = fs.statSync(base);
    if (stat.isFile()) return true;
    if (stat.isDirectory()) {
      return exts.some((ext) =>
        fs.existsSync(path.join(base, `index.${ext}`)),
      );
    }
  }
  return false;
}

function getVariants(str) {
  const variants = new Set([
    str,
    str.replace(/-/g, '_'),
    str.replace(/_/g, '-'),
  ]);
  const camel = str.replace(/[-_]+(.)/g, (_, c) => c.toUpperCase());
  variants.add(camel);
  variants.add(camel.charAt(0).toUpperCase() + camel.slice(1));
  const snake = str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  variants.add(snake);
  variants.add(snake.replace(/_/g, '-'));
  return [...variants];
}

function routeExists(dynPath) {
  const base = dynPath.replace(/\.(jsx?|tsx?|mjs|cjs)$/, '').replace(/\/index$/, '');
  const htmlExts = [...exts, 'html'];
  for (const b of getVariants(base)) {
    if (fg.sync(`apps/**/${b}`, { cwd: root, onlyDirectories: true }).length) return true;
    const patterns = [
      `apps/${b}.{${htmlExts.join(',')}}`,
      `apps/${b}/index.{${htmlExts.join(',')}}`,
      `apps/**/${b}.{${htmlExts.join(',')}}`,
      `apps/**/${b}/index.{${htmlExts.join(',')}}`,
    ];
    if (fg.sync(patterns, { cwd: root }).length) return true;
  }
  return false;
}

function idResolves(id) {
  const htmlExts = [...exts, 'html'];
  for (const v of getVariants(id)) {
    if (fg.sync(`apps/**/${v}`, { cwd: root, onlyDirectories: true }).length) return true;
    const patterns = [
      `apps/${v}.{${htmlExts.join(',')}}`,
      `apps/${v}/index.{${htmlExts.join(',')}}`,
      `apps/**/${v}.{${htmlExts.join(',')}}`,
      `apps/**/${v}/index.{${htmlExts.join(',')}}`,
    ];
    if (fg.sync(patterns, { cwd: root }).length) return true;
  }
  return false;
}

const errors = [];

// Validate dynamic imports
const dynamicImportRegex = /createDynamicApp\('([^']+)'/g;
for (const match of config.matchAll(dynamicImportRegex)) {
  const dynPath = match[1];
  const componentPath = path.join(root, 'components', 'apps', dynPath);
  if (!hasModule(componentPath)) {
    errors.push(`Missing dynamic import module: components/apps/${dynPath}`);
  }
  if (!routeExists(dynPath)) {
    errors.push(`Missing route for dynamic app: ${dynPath}`);
  }
}

// Extract id and icon pairs
const entryRegex = /id:\s*'([^']+)'[\s\S]*?icon:\s*'([^']+)'/g;
const entries = [];
for (const match of config.matchAll(entryRegex)) {
  entries.push({ id: match[1], icon: match[2] });
}

// Check unique IDs and icon paths
const idSet = new Set();
for (const { id, icon } of entries) {
  if (idSet.has(id)) {
    errors.push(`Duplicate app id: ${id}`);
  } else {
    idSet.add(id);
  }
  const iconPath = path.join(root, 'public', icon.replace(/^\//, ''));
  if (!fs.existsSync(iconPath)) {
    errors.push(`Missing icon: ${icon}`);
  }
  if (!idResolves(id)) {
    errors.push(`Missing app module for id: ${id}`);
  }
}

if (errors.length) {
  console.error('App validation failed:');
  for (const err of errors) console.error(` - ${err}`);
  process.exit(1);
} else {
  console.log('All apps validated successfully.');
}
