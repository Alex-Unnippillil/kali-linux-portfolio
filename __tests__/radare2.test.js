import {
  saveSnippet,
  loadSnippets,
  convertAnalysisToGhidra,
  saveNotes,
  loadNotes,
  saveBookmarks,
  loadBookmarks,
  extractStrings,
  savePatches,
  loadPatches,
} from '../components/apps/radare2/utils';

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

  test('stores notes per file', () => {
    const notesA = [{ addr: '0x1', text: 'foo' }];
    const notesB = [{ addr: '0x2', text: 'bar' }];
    saveNotes('a.bin', notesA);
    saveNotes('b.bin', notesB);
    expect(loadNotes('a.bin')).toEqual(notesA);
    expect(loadNotes('b.bin')).toEqual(notesB);
  });

  test('stores bookmarks per file', () => {
    const bmA = ['0x1'];
    const bmB = ['0x2'];
    saveBookmarks('a.bin', bmA);
    saveBookmarks('b.bin', bmB);
    expect(loadBookmarks('a.bin')).toEqual(bmA);
    expect(loadBookmarks('b.bin')).toEqual(bmB);
  });

  test('stores patches per file', () => {
    const patches = [{ offset: 1, value: 'ff' }];
    savePatches('a.bin', patches);
    expect(loadPatches('a.bin')).toEqual(patches);
  });

  test('extracts ASCII and UTF-16 strings', () => {
    const hex = '746573740068006900';
    expect(extractStrings(hex, '0x1000')).toEqual([
      { addr: '0x1000', text: 'test' },
      { addr: '0x1005', text: 'hi' },
    ]);
  });
});
