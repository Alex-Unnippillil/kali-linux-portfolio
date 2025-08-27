
import { createSeededRandom, copyText, exportFavorites } from '../components/apps/quote_generator';

describe('quote generator utilities', () => {
  test('seeded random reproduces same sequence', () => {
    const r1 = createSeededRandom(123);
    const r2 = createSeededRandom(123);
    const r3 = createSeededRandom(124);
    const seq1 = [r1(), r1(), r1()];
    const seq2 = [r2(), r2(), r2()];
    const seq3 = [r3(), r3(), r3()];
    expect(seq1).toEqual(seq2);
    expect(seq1).not.toEqual(seq3);
  });

  test('copy writes text to clipboard', () => {
    const write = jest.fn();
    const clipboard = { writeText: write } as any;
    copyText('hello', clipboard);
    expect(write).toHaveBeenCalledWith('hello');
  });

  test('favorites export works', () => {
    const blobUrl = 'blob:mock';
    const createSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue(blobUrl);
    jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const link = { href: '', download: '', click: jest.fn() } as any;
    jest.spyOn(document, 'createElement').mockReturnValue(link);
    const favs = [{ content: 'a', author: 'b', tags: ['general'] }];
    exportFavorites(favs);
    expect(createSpy).toHaveBeenCalled();
    expect(link.click).toHaveBeenCalled();
  });
});
