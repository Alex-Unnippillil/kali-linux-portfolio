import { computeFlowField, Vec } from '../apps/games/tower-defense';

const setFromCoords = (coords: Vec[]) =>
  new Set(coords.map((c) => `${c.x},${c.y}`));

describe('tower defense flow field', () => {
  const start: Vec = { x: 0, y: 0 };
  const goal: Vec = { x: 0, y: 2 };

  it('builds a flow that follows the drawn path', () => {
    const allowed = setFromCoords([
      start,
      { x: 0, y: 1 },
      goal,
    ]);
    const field = computeFlowField(start, goal, [], allowed);
    expect(field).not.toBeNull();
    expect(field?.[0][0]).toEqual({ x: 0, y: 1 });
    expect(field?.[0][1]).toEqual({ x: 0, y: 1 });
  });

  it('rejects disconnected paths', () => {
    const allowed = setFromCoords([start, goal]);
    const field = computeFlowField(start, goal, [], allowed);
    expect(field).toBeNull();
  });

  it('blocks routes that towers occupy', () => {
    const allowed = setFromCoords([
      start,
      { x: 0, y: 1 },
      goal,
    ]);
    const field = computeFlowField(start, goal, [{ x: 0, y: 1 }], allowed);
    expect(field).toBeNull();
  });
});
