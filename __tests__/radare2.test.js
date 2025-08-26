import { saveSnippet, loadSnippets, convertAnalysisToGhidra } from '../components/apps/radare2/utils';

describe('Radare2 utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('saves and loads snippets', () => {
    saveSnippet('disasm', 'pd 10');
    saveSnippet('analyze', 'aaa');
    expect(loadSnippets()).toEqual([
      { name: 'disasm', command: 'pd 10' },
      { name: 'analyze', command: 'aaa' },
    ]);
  });

  test('converts analysis to ghidra format', () => {
    const analysis = 'main -> sub\nsub -> helper';
    expect(convertAnalysisToGhidra(analysis)).toEqual({
      functions: [
        { name: 'main', calls: ['sub'] },
        { name: 'sub', calls: ['helper'] },
        { name: 'helper', calls: [] },
      ],
    });
  });
});
