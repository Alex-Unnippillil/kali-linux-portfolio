import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Helper to parse [Default Applications] section
function parseMimeApps(content: string): Record<string, string[]> {
  const lines = content.split(/\r?\n/);
  let inSection = false;
  const map: Record<string, string[]> = {};
  for (const line of lines) {
    if (!inSection) {
      if (line.trim() === '[Default Applications]') inSection = true;
      continue;
    }
    if (/^\s*\[.*\]\s*$/.test(line)) break;
      if (!line.includes('=')) continue;
      const [mime, appsStr = ''] = line.split('=');
      const apps = appsStr
        .split(';')
        .map((a) => a.trim())
        .filter(Boolean);
      if (mime) {
        map[mime.trim()] = apps;
      }
  }
  return map;
}

// Helper to stringify mapping back to file
function stringifyMimeApps(map: Record<string, string[]>): string {
  const lines = ['[Default Applications]'];
  for (const [mime, apps] of Object.entries(map)) {
    const line = `${mime}=${apps.join(';')}${apps.length ? ';' : ''}`;
    lines.push(line);
  }
  return lines.join('\n');
}

function exportMimeApps(listPath: string, jsonPath: string) {
  const content = fs.readFileSync(listPath, 'utf8');
  const map = parseMimeApps(content);
  fs.writeFileSync(jsonPath, JSON.stringify(map, null, 2));
}

function importMimeApps(jsonPath: string, listPath: string) {
  const newMap = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as Record<string, string[]>;
  let current: Record<string, string[]> = {};
  if (fs.existsSync(listPath)) {
    current = parseMimeApps(fs.readFileSync(listPath, 'utf8'));
  }
  const merged = { ...current, ...newMap };
  fs.writeFileSync(listPath, stringifyMimeApps(merged));
}

test('export and import mimeapps.json safely', async ({}, testInfo) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mimeapps-test-'));
  const listPath = path.join(dir, 'mimeapps.list');
  const jsonPath = path.join(dir, 'mimeapps.json');

  const initial = `[Default Applications]\ntext/plain=vim.desktop;\nimage/jpeg=gimp.desktop;`;
  fs.writeFileSync(listPath, initial);

  // Export to JSON and verify mapping
  exportMimeApps(listPath, jsonPath);
  const exported = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as Record<string, string[]>;
  expect(exported).toEqual({
    'text/plain': ['vim.desktop'],
    'image/jpeg': ['gimp.desktop'],
  });

  // Modify JSON and import
  exported['text/plain'] = ['nano.desktop'];
  exported['application/pdf'] = ['evince.desktop'];
  fs.writeFileSync(jsonPath, JSON.stringify(exported, null, 2));

  importMimeApps(jsonPath, listPath);
  const finalContent = fs.readFileSync(listPath, 'utf8');
  expect(finalContent).toContain('text/plain=nano.desktop;');
  expect(finalContent).toContain('image/jpeg=gimp.desktop;');
  expect(finalContent).toContain('application/pdf=evince.desktop;');
});

