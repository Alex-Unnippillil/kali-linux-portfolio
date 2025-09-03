#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const localesDir = path.resolve(process.cwd(), 'locales');
const fix = process.argv.includes('--fix');

if (!fs.existsSync(localesDir)) {
  // No locales directory, nothing to do
  process.exit(0);
}

const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
let hasError = false;

for (const file of localeFiles) {
  const filePath = path.join(localesDir, file);
  const raw = fs.readFileSync(filePath, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error(`${filePath}: invalid JSON`);
    hasError = true;
    continue;
  }

  let fileModified = false;

  function walk(obj, pathArr = []) {
    for (const [key, val] of Object.entries(obj)) {
      const currentPath = [...pathArr, key];
      if (typeof val === 'string') {
        const original = val;
        let str = val;
        // Autofix for named params: %{name} -> {{name}}
        str = str.replace(/%\{(\w+)\}/g, (_, p1) => {
          fileModified = true;
          return `{{${p1}}}`;
        });
        // Autofix for spaces inside placeholders: {{ name }} -> {{name}}
        str = str.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, p1) => {
          const fixed = `{{${p1}}}`;
          if (match !== fixed) fileModified = true;
          return fixed;
        });
        if (fix && str !== original) {
          obj[key] = str;
        }
        const open = (str.match(/\{\{/g) || []).length;
        const close = (str.match(/\}\}/g) || []).length;
        const unsafe =
          /%[sd]/.test(str) ||
          /\{\{\s*\d+\s*\}\}/.test(str) ||
          /\{\{\s*\}\}/.test(str) ||
          open !== close;
        if (unsafe) {
          hasError = true;
          console.error(`${filePath}:${currentPath.join('.')} => "${original}"`);
        }
      } else if (val && typeof val === 'object') {
        walk(val, currentPath);
      }
    }
  }

  walk(data);

  if (fix && fileModified) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  }
}

if (hasError) {
  console.error('Locale placeholder check failed.');
  process.exit(1);
}
