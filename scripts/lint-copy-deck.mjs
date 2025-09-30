#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const COPY_DIR = path.join(ROOT_DIR, 'data', 'copy');

const LIMITS = {
  tagline: { max: 60 },
  secondary: { max: 140 },
};

const countCharacters = (value) => Array.from(value).length;

const loadDeckFiles = async () => {
  try {
    const files = await fs.readdir(COPY_DIR, { withFileTypes: true });
    return files
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => path.join(COPY_DIR, entry.name));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

const validateEntry = (entry, index, errors, seenIds, sourceName) => {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    errors.push(`${sourceName}: entry at index ${index} must be an object.`);
    return;
  }

  const { id, tagline, secondary } = entry;
  const context = id ? `entry "${id}"` : `entry at index ${index}`;

  if (typeof id !== 'string' || id.trim() === '') {
    errors.push(`${sourceName}: ${context} must include a non-empty string id.`);
  } else if (seenIds.has(id)) {
    errors.push(`${sourceName}: duplicate id "${id}".`);
  } else {
    seenIds.add(id);
  }

  for (const [field, limit] of Object.entries(LIMITS)) {
    const value = entry[field];
    if (typeof value !== 'string') {
      errors.push(`${sourceName}: ${context} must include a string ${field}.`);
      continue;
    }

    if (value !== value.trim()) {
      errors.push(`${sourceName}: ${context} has leading or trailing whitespace in ${field}.`);
    }

    const length = countCharacters(value.trim());
    if (length === 0) {
      errors.push(`${sourceName}: ${context} must include a non-empty ${field}.`);
    }
    if (limit.max && length > limit.max) {
      errors.push(
        `${sourceName}: ${context} ${field} is ${length} characters (max ${limit.max}).`,
      );
    }
  }
};

const run = async () => {
  const deckFiles = await loadDeckFiles();
  if (deckFiles.length === 0) {
    console.log('No copy deck files found. Skipping copy deck lint.');
    return;
  }

  const errors = [];

  for (const filePath of deckFiles) {
    const sourceName = path.relative(ROOT_DIR, filePath);
    let raw;
    try {
      raw = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      errors.push(`${sourceName}: unable to read file (${error.message}).`);
      continue;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (error) {
      errors.push(`${sourceName}: invalid JSON (${error.message}).`);
      continue;
    }

    if (!Array.isArray(data)) {
      errors.push(`${sourceName}: top-level JSON must be an array of entries.`);
      continue;
    }

    const seenIds = new Set();
    data.forEach((entry, index) => {
      validateEntry(entry, index, errors, seenIds, sourceName);
    });
  }

  if (errors.length > 0) {
    console.error('Copy deck lint failed:\n');
    errors.forEach((message) => {
      console.error(` • ${message}`);
    });
    process.exit(1);
  }

  console.log(`Copy deck lint passed for ${deckFiles.length} file${deckFiles.length === 1 ? '' : 's'}.`);
};

run().catch((error) => {
  console.error('Unexpected error while linting copy deck entries:');
  console.error(error);
  process.exit(1);
});
