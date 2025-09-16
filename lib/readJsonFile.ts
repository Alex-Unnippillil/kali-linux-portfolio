import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function readJsonFile<T>(relativePath: string): Promise<T> {
  const filePath = path.join(process.cwd(), relativePath);
  try {
    const fileContents = await readFile(filePath, 'utf8');
    return JSON.parse(fileContents) as T;
  } catch (error) {
    console.error(`Failed to load JSON file: ${relativePath}`, error);
    throw new Error(`Unable to load data from ${relativePath}`);
  }
}
