import 'fake-indexeddb/auto';
import { saveScore, getScores, getHighScore, resetScores, generateShareImage } from '../components/game/score';

// polyfill structuredClone for fake-indexeddb
if (!(global as any).structuredClone) {
  (global as any).structuredClone = (val: any) => JSON.parse(JSON.stringify(val));
}

describe('score api', () => {
  beforeEach(async () => {
    await resetScores();
  });

  it('stores scores with date and session', async () => {
    await saveScore(42);
    const scores = await getScores();
    expect(scores).toHaveLength(1);
    expect(scores[0].score).toBe(42);
    expect(typeof scores[0].date).toBe('string');
    expect(typeof scores[0].session).toBe('string');
  });

  it('retrieves high score', async () => {
    await saveScore(10);
    await saveScore(50);
    expect(await getHighScore()).toBe(50);
  });

  it('generates shareable image quickly', async () => {
    await saveScore(1);
    const start = performance.now();
    const url = await generateShareImage();
    const elapsed = performance.now() - start;
    expect(typeof url).toBe('string');
    expect(elapsed).toBeLessThan(300);
  });
});
