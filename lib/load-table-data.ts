import fs from 'fs';
import path from 'path';

export interface TableRow {
  [key: string]: any;
  tags?: string[];
}

/**
 * Load a CSV or JSON file at build time and return an array of rows.
 * CSV rows will be parsed using the first line as headers.
 * A `tags` column will be split on `|` into an array.
 */
export function loadTableData(relPath: string): TableRow[] {
  const fullPath = path.join(process.cwd(), relPath);
  const text = fs.readFileSync(fullPath, 'utf8');
  if (relPath.endsWith('.json')) {
    return JSON.parse(text);
  }
  if (relPath.endsWith('.csv')) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines.shift()?.split(',') || [];
    return lines.filter(Boolean).map((line) => {
      const values = line.split(',');
      const row: Record<string, any> = {};
      headers.forEach((h, i) => {
        row[h] = values[i];
      });
      if (typeof row.tags === 'string') {
        row.tags = row.tags.split('|').map((t: string) => t.trim()).filter(Boolean);
      }
      return row as TableRow;
    });
  }
  throw new Error(`Unsupported file type for ${relPath}`);
}

/**
 * Build a tag index for fast filtering. Returns a mapping of tag to array of row indices.
 */
export function buildTagIndex<T extends { tags?: string[] }>(rows: T[]): Record<string, number[]> {
  const index: Record<string, number[]> = {};
  rows.forEach((row, idx) => {
    (row.tags || []).forEach((tag) => {
      (index[tag] ||= []).push(idx);
    });
  });
  return index;
}
