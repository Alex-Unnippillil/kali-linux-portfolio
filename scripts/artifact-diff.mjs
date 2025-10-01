#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

const cwd = process.cwd();

const DEFAULT_OPTIONS = {
  baseDir: process.env.ARTIFACT_DIFF_BASE_DIR || 'artifact-diff/base/export',
  headDir: process.env.ARTIFACT_DIFF_HEAD_DIR || 'artifact-diff/head/export',
  baseSchema: process.env.ARTIFACT_DIFF_BASE_SCHEMA || 'artifact-diff/base/export-detail.json',
  headSchema: process.env.ARTIFACT_DIFF_HEAD_SCHEMA || 'artifact-diff/head/export-detail.json',
  outputJson: process.env.ARTIFACT_DIFF_OUTPUT_JSON || 'artifact-diff/diff.json',
  outputMarkdown: process.env.ARTIFACT_DIFF_OUTPUT_MD || 'artifact-diff/diff.md',
  jsonThreshold: Number.parseInt(process.env.ARTIFACT_DIFF_JSON_THRESHOLD ?? '', 10) || 2048,
};

const ARG_MAP = new Map([
  ['base-dir', 'baseDir'],
  ['head-dir', 'headDir'],
  ['base-schema', 'baseSchema'],
  ['head-schema', 'headSchema'],
  ['output-json', 'outputJson'],
  ['output-md', 'outputMarkdown'],
  ['json-threshold', 'jsonThreshold'],
]);

function usage() {
  return `Usage: node scripts/artifact-diff.mjs [options]\n\n` +
    `Options:\n` +
    `  --base-dir <path>         Directory containing the base branch export (default: ${DEFAULT_OPTIONS.baseDir})\n` +
    `  --head-dir <path>         Directory containing the head branch export (default: ${DEFAULT_OPTIONS.headDir})\n` +
    `  --base-schema <path>      Path to the base branch export-detail.json (default: ${DEFAULT_OPTIONS.baseSchema})\n` +
    `  --head-schema <path>      Path to the head branch export-detail.json (default: ${DEFAULT_OPTIONS.headSchema})\n` +
    `  --output-json <path>      Where to write the machine-readable diff report (default: ${DEFAULT_OPTIONS.outputJson})\n` +
    `  --output-md <path>        Where to write the Markdown summary (default: ${DEFAULT_OPTIONS.outputMarkdown})\n` +
    `  --json-threshold <bytes>  Minimum byte delta before a JSON file gets a structural summary (default: ${DEFAULT_OPTIONS.jsonThreshold})\n` +
    `  -h, --help                Show this message\n`;
}

function parseArgs(argv) {
  const options = { ...DEFAULT_OPTIONS };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      return { ...options, help: true };
    }
    if (!arg.startsWith('--')) {
      continue;
    }
    const key = arg.slice(2);
    const mapped = ARG_MAP.get(key);
    if (!mapped) {
      throw new Error(`Unknown option: --${key}`);
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      throw new Error(`Option --${key} requires a value`);
    }
    if (mapped === 'jsonThreshold') {
      const num = Number.parseInt(next, 10);
      if (Number.isNaN(num) || num < 0) {
        throw new Error(`Invalid value for --${key}: ${next}`);
      }
      options[mapped] = num;
    } else {
      options[mapped] = next;
    }
    i += 1;
  }
  return options;
}

function toAbsolute(p) {
  if (!p) return null;
  return path.resolve(cwd, p);
}

async function readJson(filePath) {
  if (!filePath) {
    return { status: 'missing' };
  }
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return { status: 'ok', value: JSON.parse(raw) };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { status: 'missing' };
    }
    return { status: 'error', error };
  }
}

function formatValue(value) {
  if (value === undefined) return '—';
  if (typeof value === 'string') {
    return value.length > 80 ? `${value.slice(0, 77)}…` : value;
  }
  try {
    const json = JSON.stringify(value);
    return json.length > 80 ? `${json.slice(0, 77)}…` : json;
  } catch (err) {
    return String(value);
  }
}

function diffJson(base, head, pathSegments = []) {
  const diffs = [];
  const label = pathSegments.length ? pathSegments.join('.') : '(root)';
  if (base === undefined) {
    diffs.push({ type: 'added', path: label, base: undefined, head });
    return diffs;
  }
  if (head === undefined) {
    diffs.push({ type: 'removed', path: label, base, head: undefined });
    return diffs;
  }
  if (base === null || head === null) {
    if (base !== head) {
      diffs.push({ type: 'changed', path: label, base, head });
    }
    return diffs;
  }
  const baseIsArray = Array.isArray(base);
  const headIsArray = Array.isArray(head);
  if (baseIsArray || headIsArray) {
    if (!baseIsArray || !headIsArray) {
      diffs.push({ type: 'type-change', path: label, base, head });
      return diffs;
    }
    if (base.length !== head.length) {
      diffs.push({ type: 'array-length', path: label, base: base.length, head: head.length });
    }
    const sampleLength = Math.min(5, base.length, head.length);
    for (let i = 0; i < sampleLength; i += 1) {
      const childDiffs = diffJson(base[i], head[i], [...pathSegments, `[${i}]`]);
      for (const diff of childDiffs.slice(0, 5)) {
        diffs.push(diff);
        if (diffs.length >= 20) return diffs;
      }
    }
    return diffs;
  }
  if (typeof base !== 'object' || typeof head !== 'object') {
    if (!Object.is(base, head)) {
      diffs.push({ type: 'changed', path: label, base, head });
    }
    return diffs;
  }
  const keys = new Set([...Object.keys(base), ...Object.keys(head)]);
  for (const key of keys) {
    const childDiffs = diffJson(base[key], head[key], [...pathSegments, key]);
    for (const diff of childDiffs) {
      diffs.push(diff);
      if (diffs.length >= 50) return diffs;
    }
  }
  return diffs;
}

async function walkFiles(rootDir) {
  const files = new Map();
  if (!rootDir) return files;
  try {
    await fs.access(rootDir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return files;
    }
    throw error;
  }
  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(absPath);
      } else if (entry.isFile()) {
        const stat = await fs.stat(absPath);
        const rel = path.relative(rootDir, absPath).split(path.sep).join('/');
        files.set(rel, { size: stat.size, path: absPath });
      }
    }
  }
  await walk(rootDir);
  return files;
}

function createFileDiffs(baseFiles, headFiles) {
  const all = new Set([...baseFiles.keys(), ...headFiles.keys()]);
  const diffs = [];
  for (const file of all) {
    const baseEntry = baseFiles.get(file);
    const headEntry = headFiles.get(file);
    const baseSize = baseEntry ? baseEntry.size : 0;
    const headSize = headEntry ? headEntry.size : 0;
    const delta = headSize - baseSize;
    let status = 'unchanged';
    if (!baseEntry && headEntry) status = 'added';
    else if (baseEntry && !headEntry) status = 'removed';
    else if (delta !== 0) status = 'changed';
    diffs.push({
      file,
      baseSize,
      headSize,
      delta,
      percent: baseSize > 0 ? (delta / baseSize) * 100 : null,
      status,
    });
  }
  return diffs
    .filter((diff) => diff.status !== 'unchanged')
    .sort((a, b) => {
      const weight = Math.abs(b.delta) - Math.abs(a.delta);
      if (weight !== 0) return weight;
      return a.file.localeCompare(b.file);
    });
}

function formatSize(bytes) {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const sign = bytes < 0 ? '-' : '';
  let value = Math.abs(bytes);
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const magnitude = value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 2);
  return `${sign}${magnitude} ${units[unitIndex]}`;
}

function formatPercent(percent) {
  if (percent === null || percent === undefined) return '—';
  if (!Number.isFinite(percent)) return '—';
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`;
}

function analyzeStructure(value) {
  if (Array.isArray(value)) {
    const objectKeySet = new Set();
    const primitiveTypes = new Set();
    for (const item of value.slice(0, 50)) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        for (const key of Object.keys(item)) {
          objectKeySet.add(key);
          if (objectKeySet.size >= 50) break;
        }
      } else {
        primitiveTypes.add(item === null ? 'null' : typeof item);
      }
    }
    return {
      kind: 'array',
      length: value.length,
      objectKeySet,
      primitiveTypes,
    };
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    return {
      kind: 'object',
      keysCount: keys.length,
      keySet: new Set(keys),
    };
  }
  return {
    kind: 'primitive',
    type: value === null ? 'null' : typeof value,
  };
}

function describeStructure(info) {
  if (!info) return '—';
  if (info.kind === 'object') return `${info.keysCount} keys`;
  if (info.kind === 'array') return `${info.length} items`;
  if (info.kind === 'primitive') return `primitive (${info.type})`;
  return '—';
}

function buildStructureNotes(baseInfo, headInfo) {
  const notes = [];
  if (baseInfo?.kind === 'object' || headInfo?.kind === 'object') {
    const baseSet = baseInfo?.keySet ?? new Set();
    const headSet = headInfo?.keySet ?? new Set();
    const added = [];
    const removed = [];
    let hasMoreAdded = false;
    let hasMoreRemoved = false;
    for (const key of headSet) {
      if (!baseSet.has(key)) {
        added.push(key);
        if (added.length >= 5) {
          hasMoreAdded = true;
          break;
        }
      }
    }
    for (const key of baseSet) {
      if (!headSet.has(key)) {
        removed.push(key);
        if (removed.length >= 5) {
          hasMoreRemoved = true;
          break;
        }
      }
    }
    if (added.length) {
      notes.push(`added keys: ${added.join(', ')}${hasMoreAdded ? '…' : ''}`);
    }
    if (removed.length) {
      notes.push(`removed keys: ${removed.join(', ')}${hasMoreRemoved ? '…' : ''}`);
    }
  }
  if (baseInfo?.kind === 'array' || headInfo?.kind === 'array') {
    const baseLength = baseInfo?.length ?? 0;
    const headLength = headInfo?.length ?? 0;
    if (baseLength !== headLength) {
      const delta = headLength - baseLength;
      notes.push(`${delta >= 0 ? '+' : ''}${delta} items`);
    }
    const headTypes = headInfo?.primitiveTypes ?? new Set();
    if (headTypes.size > 0) {
      notes.push(`head item types: ${Array.from(headTypes).join(', ')}`);
    }
    const headObjectKeys = headInfo?.objectKeySet ?? new Set();
    if (headObjectKeys.size > 0) {
      notes.push(`head object keys: ${Array.from(headObjectKeys).slice(0, 5).join(', ')}${headObjectKeys.size > 5 ? '…' : ''}`);
    }
  }
  return notes.join('; ');
}

async function summariseJsonDiff(diff, baseDir, headDir, threshold) {
  if (!diff.file.endsWith('.json')) return null;
  const basePath = diff.status === 'added' ? null : path.join(baseDir, diff.file);
  const headPath = diff.status === 'removed' ? null : path.join(headDir, diff.file);
  let baseJson;
  let headJson;
  let baseError;
  let headError;
  if (basePath) {
    const res = await readJson(basePath);
    if (res.status === 'ok') baseJson = res.value;
    else if (res.status === 'error') baseError = res.error;
  }
  if (headPath) {
    const res = await readJson(headPath);
    if (res.status === 'ok') headJson = res.value;
    else if (res.status === 'error') headError = res.error;
  }
  if (baseError || headError) {
    return {
      file: diff.file,
      base: baseError ? 'parse error' : describeStructure(baseJson ? analyzeStructure(baseJson) : null),
      head: headError ? 'parse error' : describeStructure(headJson ? analyzeStructure(headJson) : null),
      delta: formatSize(diff.delta),
      notes: baseError ? `base error: ${baseError.message}` : headError ? `head error: ${headError.message}` : '',
    };
  }
  const baseInfo = baseJson === undefined ? null : analyzeStructure(baseJson);
  const headInfo = headJson === undefined ? null : analyzeStructure(headJson);
  const structuralDelta = (() => {
    if (baseInfo?.kind === 'object' && headInfo?.kind === 'object') {
      return headInfo.keysCount - baseInfo.keysCount;
    }
    if (baseInfo?.kind === 'array' && headInfo?.kind === 'array') {
      return headInfo.length - baseInfo.length;
    }
    return null;
  })();
  const include = diff.status !== 'changed'
    ? true
    : Math.abs(diff.delta) >= threshold || (structuralDelta !== null && structuralDelta !== 0);
  if (!include) return null;
  const deltaDescription = (() => {
    if (structuralDelta !== null && structuralDelta !== 0) {
      return `${structuralDelta >= 0 ? '+' : ''}${structuralDelta} ${baseInfo?.kind === 'array' ? 'items' : 'keys'}`;
    }
    if (diff.status === 'added') return 'added';
    if (diff.status === 'removed') return 'removed';
    return formatSize(diff.delta);
  })();
  const notes = buildStructureNotes(baseInfo, headInfo);
  return {
    file: diff.file,
    base: describeStructure(baseInfo),
    head: describeStructure(headInfo),
    delta: deltaDescription,
    notes,
  };
}

function escapeCell(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>');
}

function renderTable(headers, rows) {
  if (rows.length === 0) return '';
  const headerLine = `| ${headers.map(escapeCell).join(' | ')} |`;
  const separator = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows
    .map((row) => `| ${row.map(escapeCell).join(' | ')} |`)
    .join('\n');
  return `${headerLine}\n${separator}\n${body}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  const baseSchemaPath = toAbsolute(args.baseSchema);
  const headSchemaPath = toAbsolute(args.headSchema);
  const baseDir = toAbsolute(args.baseDir);
  const headDir = toAbsolute(args.headDir);

  const baseSchema = await readJson(baseSchemaPath);
  const headSchema = await readJson(headSchemaPath);

  if (baseSchema.status === 'error') {
    throw baseSchema.error;
  }
  if (headSchema.status === 'error') {
    throw headSchema.error;
  }

  const schemaDiffs = (() => {
    if (baseSchema.status === 'missing' && headSchema.status === 'missing') {
      return [];
    }
    if (baseSchema.status === 'missing') {
      return [{ type: 'added', path: '(file)', base: undefined, head: headSchema.value }];
    }
    if (headSchema.status === 'missing') {
      return [{ type: 'removed', path: '(file)', base: baseSchema.value, head: undefined }];
    }
    return diffJson(baseSchema.value, headSchema.value);
  })();

  const baseFiles = await walkFiles(baseDir);
  const headFiles = await walkFiles(headDir);
  const fileDiffs = createFileDiffs(baseFiles, headFiles);

  const jsonSummaries = [];
  for (const diff of fileDiffs) {
    const summary = await summariseJsonDiff(diff, baseDir, headDir, args.jsonThreshold);
    if (summary) {
      jsonSummaries.push(summary);
    }
  }

  const report = {
    options: args,
    base: {
      schemaPath: baseSchemaPath,
      exportDir: baseDir,
      schemaStatus: baseSchema.status,
    },
    head: {
      schemaPath: headSchemaPath,
      exportDir: headDir,
      schemaStatus: headSchema.status,
    },
    schemaDiffs,
    fileDiffs,
    jsonSummaries,
  };

  if (args.outputJson) {
    const outputJsonPath = toAbsolute(args.outputJson);
    await fs.mkdir(path.dirname(outputJsonPath), { recursive: true });
    await fs.writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  if (args.outputMarkdown) {
    const lines = ['# Export artifact diff'];

    lines.push('', '## Export schema');
    if (schemaDiffs.length === 0) {
      lines.push('', 'No schema differences detected.');
    } else {
      const rows = schemaDiffs.map((diff) => [
        diff.path,
        diff.type,
        formatValue(diff.base),
        formatValue(diff.head),
      ]);
      lines.push('', renderTable(['Path', 'Change', 'Base', 'Head'], rows));
    }

    lines.push('', '## File size changes');
    if (fileDiffs.length === 0) {
      lines.push('', 'No file size differences detected.');
    } else {
      const rows = fileDiffs.map((diff) => [
        diff.file,
        formatSize(diff.baseSize),
        formatSize(diff.headSize),
        `${diff.delta >= 0 ? '+' : ''}${formatSize(diff.delta)}`,
        formatPercent(diff.percent),
        diff.status,
      ]);
      lines.push('', renderTable(['File', 'Base', 'Head', 'Δ', 'Δ%', 'Status'], rows));
    }

    lines.push('', '## Large JSON changes');
    if (jsonSummaries.length === 0) {
      lines.push('', 'No large JSON changes detected.');
    } else {
      const rows = jsonSummaries.map((summary) => [
        summary.file,
        summary.base,
        summary.head,
        summary.delta,
        summary.notes || '—',
      ]);
      lines.push('', renderTable(['File', 'Base', 'Head', 'Δ', 'Notes'], rows));
    }

    const outputMarkdownPath = toAbsolute(args.outputMarkdown);
    await fs.mkdir(path.dirname(outputMarkdownPath), { recursive: true });
    await fs.writeFile(outputMarkdownPath, `${lines.join('\n')}\n`, 'utf8');
  }

  if (!args.outputJson && !args.outputMarkdown) {
    console.log(JSON.stringify(report, null, 2));
  }
}

main().catch((error) => {
  console.error('artifact-diff failed:', error);
  process.exit(1);
});
