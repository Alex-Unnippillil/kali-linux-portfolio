import fs from 'fs';
import path from 'path';
import yaraFactory from 'libyara-wasm';

test('fixture rule detects sample and exposes meta and strings', async () => {
  const yara = await (yaraFactory.default ? yaraFactory.default() : (yaraFactory as any)());
  const rule = fs.readFileSync(path.join(__dirname, 'fixtures/yara/rule.yar'), 'utf8');
  const sample = fs.readFileSync(path.join(__dirname, 'fixtures/yara/sample.txt'), 'utf8');
  const res = yara.run(sample, rule);
  const matches = res.matchedRules;
  expect(matches.size()).toBe(1);
  const m = matches.get(0);
  expect(m.ruleName).toBe('SampleRule');
  const meta = (m as any).metadata;
  expect(meta.get(0).identifier).toBe('description');
  expect(meta.get(0).data).toBe('Detects sample string');
  const rm = m.resolvedMatches;
  expect(rm.size()).toBe(2);
  const ids = [rm.get(0).stringIdentifier, rm.get(1).stringIdentifier];
  expect(ids.sort()).toEqual(['$a', '$b']);
});
