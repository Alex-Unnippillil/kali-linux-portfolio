import { MonteCarloAI } from '@components/apps/battleship/ai';

test('AI computes move under 200ms', () => {
  const ai = new MonteCarloAI();
  // simulate some prior knowledge
  ai.record(0, false);
  ai.record(1, false);
  const start = Date.now();
  const move = ai.nextMove(300);
  const duration = Date.now() - start;
  expect(move).not.toBeNull();
  expect(duration).toBeLessThan(200);
});
