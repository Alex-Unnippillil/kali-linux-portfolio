import { PieceGenerator } from '../games/tetris/logic';

describe('PieceGenerator', () => {
  it('serializes and loads bag state', () => {
    const generator = new PieceGenerator('seven-bag');
    const first = generator.next();
    const second = generator.next();
    expect(first).not.toBe(second);
    const snapshot = generator.serialize();
    const restored = new PieceGenerator('true-random');
    restored.load(snapshot);
    expect(restored.next()).toEqual(generator.next());
  });

  it('retains bag contents when switching to the same mode', () => {
    const generator = new PieceGenerator('seven-bag');
    generator.next();
    generator.next();
    const before = generator.serialize().bag;
    generator.setMode('seven-bag');
    expect(generator.serialize().bag).toEqual(before);
  });

  it('clones loaded bag data to avoid external mutation', () => {
    const snapshot = { mode: 'seven-bag' as const, bag: ['I', 'J'] as const };
    const generator = new PieceGenerator('true-random');
    generator.load(snapshot);
    const loaded = generator.serialize().bag;
    expect(loaded).toEqual(['I', 'J']);
    (snapshot.bag as unknown as string[]).push('L');
    expect(generator.serialize().bag).toEqual(['I', 'J']);
  });
});
