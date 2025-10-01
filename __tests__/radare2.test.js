import {
  saveSnippet,
  loadSnippets,
  convertAnalysisToGhidra,
  saveNotes,
  loadNotes,
  saveBookmarks,
  loadBookmarks,
  extractStrings,
  loadAnnotations,
  persistAnnotations,
  loadAnnotationSnapshot,
  snapshotToAnnotations,
  createHistory,
  pushHistory,
  undoHistory,
  redoHistory,
  createAnnotationExport,
  annotationsEqual,
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

  test('extracts ASCII and UTF-16 strings', () => {
    const hex = '746573740068006900';
    expect(extractStrings(hex, '0x1000')).toEqual([
      { addr: '0x1000', text: 'test' },
      { addr: '0x1005', text: 'hi' },
    ]);
  });

  test('persists annotations and snapshots independently per file', () => {
    const disasm = [
      { addr: '0x10', text: 'mov eax, ebx' },
      { addr: '0x12', text: 'ret' },
    ];
    persistAnnotations('demo.bin', disasm, {
      '0x10': { label: 'entry', comment: 'setup' },
    });
    expect(loadAnnotations('demo.bin')).toEqual({
      '0x10': { label: 'entry', comment: 'setup' },
    });
    const snapshot = loadAnnotationSnapshot('demo.bin');
    expect(snapshot.file).toBe('demo.bin');
    expect(snapshot.annotations).toEqual([
      {
        addr: '0x10',
        label: 'entry',
        comment: 'setup',
        text: 'mov eax, ebx',
      },
    ]);
    expect(snapshotToAnnotations(snapshot)).toEqual({
      '0x10': { label: 'entry', comment: 'setup' },
    });
  });

  test('manages undo and redo history', () => {
    const history = createHistory({});
    const withFirst = pushHistory(history, { '0x1': { label: 'start' } }, {
      type: 'update',
    });
    const withSecond = pushHistory(
      withFirst,
      { '0x1': { label: 'start' }, '0x2': { comment: 'exit' } },
      { type: 'update' },
    );
    const undone = undoHistory(withSecond);
    expect(annotationsEqual(undone.present, { '0x1': { label: 'start' } })).toBe(true);
    const redone = redoHistory(undone);
    expect(annotationsEqual(redone.present, withSecond.present)).toBe(true);
  });

  test('creates deterministic annotation export payload', () => {
    const disasm = [
      { addr: '0x2', text: 'ret' },
      { addr: '0x1', text: 'push rbp' },
    ];
    const exportPayload = createAnnotationExport('demo.bin', disasm, {
      '0x1': { label: 'prologue' },
      '0x2': { comment: 'exit' },
    });
    expect(exportPayload.annotations).toEqual([
      {
        addr: '0x1',
        label: 'prologue',
        comment: null,
        text: 'push rbp',
      },
      {
        addr: '0x2',
        label: null,
        comment: 'exit',
        text: 'ret',
      },
    ]);
    expect(exportPayload.disassembly).toEqual(disasm);
  });
});
