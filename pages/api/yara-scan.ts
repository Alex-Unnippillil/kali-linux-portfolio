import type { NextApiRequest, NextApiResponse } from 'next';
import yaraFactory from 'libyara-wasm';
import { setupUrlGuard } from '../../lib/urlGuard';

setupUrlGuard();

interface MatchDetail {
  rule: string;
  tags?: string[];
  meta?: Record<string, string>;
  matches: { identifier: string; data: string; offset: number; length: number }[];
}

interface CompileError {
  message: string;
  line?: number;
  column?: number;
  warning?: boolean;
}

let yara: any;

async function getYara() {
  if (!yara) {
    const mod = await ((yaraFactory as any).default?.() ?? (yaraFactory as any)());
    yara = mod;
  }
  return yara;
}

const resolveIncludes = (files: Record<string, string>): { code: string; missing: string[] } => {
  const cache: Record<string, string> = {};
  const missing: string[] = [];
  const resolve = (name: string, stack: string[] = []): string => {
    if (cache[name]) return cache[name];
    const src = files[name];
    if (src === undefined) {
      missing.push(name);
      return '';
    }
    if (stack.includes(name)) return '';
    const out = src.replace(/include\s+"([^"]+)"/g, (_m, inc) => resolve(inc, [...stack, name]));
    cache[name] = out;
    return out;
  };
  const code = Object.keys(files)
    .map((k) => resolve(k))
    .join('\n');
  return { code, missing };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { input = '', rules = {} } = req.body || {};
  if (typeof input !== 'string' || typeof rules !== 'object') {
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }
  if (input.length > 1024 * 1024) {
    res.status(400).json({ error: 'Sample too large' });
    return;
  }
  const totalRuleSize = Object.values(rules).reduce((n: number, r: any) => n + (typeof r === 'string' ? r.length : 0), 0);
  if (totalRuleSize > 1024 * 1024) {
    res.status(400).json({ error: 'Rules too large' });
    return;
  }
  const yaraMod = await getYara();
  const { code, missing } = resolveIncludes(rules as Record<string, string>);
  const result = yaraMod.run(input, code);
  const ruleVec = result.matchedRules;
  const found: MatchDetail[] = [];
  for (let i = 0; i < ruleVec.size(); i += 1) {
    const r = ruleVec.get(i);
    const det: MatchDetail['matches'] = [];
    const rm = r.resolvedMatches;
    for (let j = 0; j < rm.size(); j += 1) {
      const m = rm.get(j);
      det.push({
        identifier: m.stringIdentifier,
        data: m.data,
        offset: m.location,
        length: m.matchLength,
      });
    }
    const meta: Record<string, string> = {};
    const metas = (r as any).metas || (r as any).metadata;
    if (metas) {
      for (let k = 0; k < metas.size(); k += 1) {
        const m = metas.get(k);
        const id = (m as any).id ?? (m as any).identifier;
        const val = (m as any).value ?? (m as any).data;
        meta[id] = val;
      }
    }
    const tags: string[] = [];
    const tagVec = r.ruleTags;
    if (tagVec) {
      for (let k = 0; k < tagVec.size(); k += 1) tags.push(tagVec.get(k));
    }
    found.push({ rule: r.ruleName, matches: det, meta, tags });
  }
  const errVec = result.compileErrors;
  const errArr: CompileError[] = [];
  for (let i = 0; i < errVec.size(); i += 1) {
    const e = errVec.get(i);
    errArr.push({
      message: e.message,
      line: e.lineNumber,
      column: (e as any).columnNumber,
      warning: e.warning,
    });
  }
  missing.forEach((m) => errArr.push({ message: `missing include: ${m}` }));
  res.status(200).json({ matches: found, compileErrors: errArr });
}
