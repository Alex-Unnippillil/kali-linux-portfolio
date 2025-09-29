#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const ROOT = process.cwd();
const DESKTOP_DIR = join(ROOT, 'applications', 'menu', 'desktop-files');
const HIERARCHY_PATH = join(ROOT, 'applications', 'menu', 'hierarchy.json');
const SYNONYMS_PATH = join(ROOT, 'applications', 'menu', 'synonyms.json');
const OUTPUT_PATH = join(ROOT, 'applications', 'menu', 'category-map.json');


const parseDesktopFile = (content) => {
  const data = {};
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith('#') || line.startsWith('[')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    data[key] = value;
  }
  return data;
};

const loadJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const hierarchy = loadJson(HIERARCHY_PATH);
const synonyms = loadJson(SYNONYMS_PATH);

const categoryIndex = new Map();
const parentIndex = new Map();

const registerNode = (node, parentId = null) => {
  if (!node || !node.id) return;
  categoryIndex.set(node.id, { id: node.id, name: node.name, translations: node.translations || {} });
  parentIndex.set(node.id, parentId);
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => registerNode(child, node.id));
  }
};

hierarchy.categories.forEach((node) => registerNode(node));

const getAncestry = (categoryId) => {
  const ancestry = [];
  let current = categoryId;
  while (current) {
    const node = categoryIndex.get(current);
    if (!node) break;
    ancestry.unshift(node);
    current = parentIndex.get(current);
  }
  return ancestry;
};

const desktopFiles = readdirSync(DESKTOP_DIR).filter((file) => extname(file) === '.desktop');
const missingCategories = new Map();
const categoryAppMap = new Map();
const apps = [];
const synonymIssues = [];

for (const file of desktopFiles.sort()) {
  const fullPath = join(DESKTOP_DIR, file);
  const parsed = parseDesktopFile(readFileSync(fullPath, 'utf8'));
  const appId = basename(file, '.desktop');
  const keywords = (parsed.Keywords || '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.toLowerCase());
  const categories = (parsed.Categories || '')
    .split(';')
    .map((item) => item.trim())
    .filter((item) => item.startsWith('kali-'));

  const topLevelMap = new Map();
  for (const categoryId of categories) {
    const ancestry = getAncestry(categoryId);
    if (ancestry.length === 0) {
      const list = missingCategories.get(categoryId) || [];
      list.push(appId);
      missingCategories.set(categoryId, list);
      continue;
    }
    const top = ancestry[0];
    let topEntry = topLevelMap.get(top.id);
    if (!topEntry) {
      topEntry = { id: top.id, name: top.name, children: new Map() };
      topLevelMap.set(top.id, topEntry);
    }
    for (let index = 1; index < ancestry.length; index += 1) {
      const child = ancestry[index];
      if (!topEntry.children.has(child.id)) {
        topEntry.children.set(child.id, { id: child.id, name: child.name });
      }
    }
    const bucket = categoryAppMap.get(top.id) || new Set();
    bucket.add(appId);
    categoryAppMap.set(top.id, bucket);
  }

  const expectedSynonyms = synonyms[appId] || [];
  const keywordValues = new Set(keywords);
  const missing = expectedSynonyms.filter((synonym) => {
    const candidate = synonym.toLowerCase();
    return !Array.from(keywordValues).some((kw) => kw.includes(candidate) || candidate.includes(kw));
  });
  if (missing.length > 0) {
    synonymIssues.push({ appId, missing });
  }

  apps.push({
    id: appId,
    file,
    name: parsed.Name || null,
    genericName: parsed.GenericName || null,
    comment: parsed.Comment || null,
    exec: parsed.Exec || null,
    icon: parsed.Icon || null,
    portfolioApp: parsed['X-Portfolio-App'] || null,
    package: parsed['X-Kali-Package'] || null,
    keywords,
    categories: Array.from(topLevelMap.values()).map((entry) => ({
      id: entry.id,
      name: entry.name,
      children: Array.from(entry.children.values()).sort((a, b) => a.name.localeCompare(b.name)),
    })).sort((a, b) => a.name.localeCompare(b.name)),
  });
}

if (synonymIssues.length > 0) {
  const details = synonymIssues
    .map((issue) => `${issue.appId}: ${issue.missing.join(', ')}`)
    .join('\n');
  throw new Error(`Synonym validation failed for the following desktop entries:\n${details}`);
}

const categorySummary = hierarchy.categories.map((category) => {
  const appsForCategory = Array.from(categoryAppMap.get(category.id) || []).sort();
  return {
    id: category.id,
    name: category.name,
    appCount: appsForCategory.length,
    apps: appsForCategory,
    children: (category.children || []).map((child) => ({ id: child.id, name: child.name })),
  };
});

const result = {
  generatedAt: new Date().toISOString(),
  desktopFiles: apps.length,
  hierarchyVersion: hierarchy.version,
  reference: hierarchy.reference,
  apps: apps.sort((a, b) => a.name.localeCompare(b.name)),
  categories: categorySummary,
  missingCategories: Array.from(missingCategories.entries()).map(([id, sources]) => ({
    id,
    apps: sources.sort(),
  })),
};

writeFileSync(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`);

console.log(`Wrote category map with ${apps.length} desktop entries to ${OUTPUT_PATH}`);

