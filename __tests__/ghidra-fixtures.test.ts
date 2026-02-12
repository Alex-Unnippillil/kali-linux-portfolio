import fs from 'fs';
import path from 'path';

describe('Ghidra fixture dataset', () => {
  const projectPath = path.join(
    process.cwd(),
    'public',
    'demo-data',
    'ghidra',
    'project.json'
  );
  const dataset = JSON.parse(fs.readFileSync(projectPath, 'utf8'));

  test('exposes lab metadata and pseudocode snippet', () => {
    expect(dataset.project).toBeDefined();
    expect(dataset.project.labMessage).toMatch(/lab use only/i);
    expect(Array.isArray(dataset.pseudocode)).toBe(true);
    expect(dataset.pseudocode.length).toBeGreaterThan(0);
  });

  test('functions reference existing targets and provide bytes', () => {
    const names = new Set(dataset.functions.map((f) => f.name));
    for (const func of dataset.functions) {
      expect(func.address).toBeDefined();
      expect(Array.isArray(func.code)).toBe(true);
      expect(Array.isArray(func.blocks)).toBe(true);
      expect(Array.isArray(func.bytes)).toBe(true);
      expect(func.bytes.length).toBeGreaterThan(0);
      for (const target of func.calls || []) {
        expect(names.has(target)).toBe(true);
      }
      const blockIds = new Set(func.blocks.map((b) => b.id));
      for (const block of func.blocks) {
        for (const edge of block.edges || []) {
          expect(blockIds.has(edge)).toBe(true);
        }
      }
    }
  });

  test('symbol table covers all functions and critical globals', () => {
    const symbolNames = new Set(dataset.symbols.map((s) => s.name));
    for (const func of dataset.functions) {
      expect(symbolNames.has(func.name)).toBe(true);
    }
    expect(symbolNames.has('g_license_key')).toBe(true);
    expect(symbolNames.has('EXPECTED_DIGEST')).toBe(true);
  });

  test('strings reference known functions', () => {
    const names = new Set(dataset.functions.map((f) => f.name));
    for (const str of dataset.strings) {
      expect(str.value.length).toBeGreaterThan(0);
      for (const ref of str.references || []) {
        expect(names.has(ref)).toBe(true);
      }
    }
  });
});
