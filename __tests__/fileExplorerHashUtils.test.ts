import { createDuplicateGroups } from '../modules/fileExplorer/hashUtils';

const toBuffer = (text: string) => new TextEncoder().encode(text).buffer;

describe('createDuplicateGroups', () => {
  it('groups identical content by hash', () => {
    const records = [
      { hash: 'abc', size: 4, segments: ['a.txt'], name: 'a.txt', content: toBuffer('test') },
      { hash: 'abc', size: 4, segments: ['b.txt'], name: 'b.txt', content: toBuffer('test') },
      { hash: 'def', size: 4, segments: ['c.txt'], name: 'c.txt', content: toBuffer('demo') },
    ];

    const groups = createDuplicateGroups(records);
    expect(groups).toHaveLength(1);
    expect(groups[0].files.map((f) => f.path)).toEqual(expect.arrayContaining(['a.txt', 'b.txt']));
  });

  it('ignores hash collisions with different content', () => {
    const records = [
      { hash: 'same', size: 3, segments: ['one.txt'], name: 'one.txt', content: toBuffer('foo') },
      { hash: 'same', size: 3, segments: ['two.txt'], name: 'two.txt', content: toBuffer('bar') },
    ];

    const groups = createDuplicateGroups(records);
    expect(groups).toHaveLength(0);
  });
});
