import fs from 'fs';
import path from 'path';

export const RAW_LEVELS = fs.readFileSync(
  path.join(__dirname, 'levels.txt'),
  'utf-8'
);

export function parseLevels(data: string): string[][] {
  const levels: string[][] = [];
  let current: string[] = [];
  data.split(/\r?\n/).forEach((line) => {
    if (line.trim() === '' || line.trim().startsWith(';')) {
      if (current.length) {
        levels.push(current);
        current = [];
      }
    } else {
      current.push(line);
    }
  });
  if (current.length) levels.push(current);
  return levels;
}

export const defaultLevels = parseLevels(RAW_LEVELS);
