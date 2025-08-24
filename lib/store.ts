import fs from 'fs/promises';
import path from 'path';
import type { Dirent, Stats } from 'fs';

const IS_PROD = process.env.NODE_ENV === 'production';

export async function readJson<T>(file: string, defaultValue: T): Promise<T> {
  if (IS_PROD) return defaultValue;
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data) as T;
  } catch {
    return defaultValue;
  }
}

export async function writeJson(file: string, data: unknown): Promise<void> {
  if (IS_PROD) return;
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

export async function readDir(
  dir: string,
  options?: { withFileTypes?: boolean },
): Promise<string[] | Dirent[]> {
  if (IS_PROD) return [];
  await fs.mkdir(dir, { recursive: true });
  try {
    return await fs.readdir(dir, options);
  } catch {
    return [];
  }
}

export async function readFile(file: string): Promise<string | undefined> {
  if (IS_PROD) return undefined;
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return undefined;
  }
}

export async function stat(file: string): Promise<Stats | undefined> {
  if (IS_PROD) return undefined;
  try {
    return await fs.stat(file);
  } catch {
    return undefined;
  }
}
