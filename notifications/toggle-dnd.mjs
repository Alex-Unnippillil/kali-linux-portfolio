#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const settingsPath = join(__dirname, 'settings.json');
let data = { dnd: false };
try {
  if (existsSync(settingsPath)) {
    const text = readFileSync(settingsPath, 'utf8');
    data = JSON.parse(text);
  }
} catch {
  // ignore JSON parse errors and use default
}

data.dnd = !data.dnd;
writeFileSync(settingsPath, JSON.stringify(data, null, 2));
const message = data.dnd ? 'Do Not Disturb Enabled' : 'Do Not Disturb Disabled';
try {
  execSync(`notify-send -t 1500 "${message}"`, { stdio: 'ignore' });
} catch {
  // ignore failures to show notification
}
