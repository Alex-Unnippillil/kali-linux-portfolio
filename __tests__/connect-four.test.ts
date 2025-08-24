import { createGame, applyDrop, hasWin, heuristic } from '@components/apps/connect-four';

describe('connect four logic', () => {
  it('detects horizontal wins', () => {
    const g = createGame();
    // create bottom row horizontal win for player 0
    applyDrop(g, 0); // p0
    applyDrop(g, 0); // p1
    applyDrop(g, 1); // p0
    applyDrop(g, 1); // p1
    applyDrop(g, 2); // p0
    applyDrop(g, 2); // p1
    applyDrop(g, 3); // p0 - winning move
    expect(hasWin(g.bitboards[0], g.rows)).toBe(true);
  });

  it('rewards center control and threats in heuristic', () => {
    const base = createGame();
    const baseScore = heuristic(base);

    const center = createGame();
    applyDrop(center, 3); // player 0 in center
    applyDrop(center, 4); // player 1 somewhere
    center.player = 0; // evaluate for player 0
    const centerScore = heuristic(center);
    expect(centerScore).toBeGreaterThan(baseScore);

    const threat = createGame();
    applyDrop(threat, 0); // p0
    applyDrop(threat, 4); // p1
    applyDrop(threat, 1); // p0
    applyDrop(threat, 4); // p1
    applyDrop(threat, 2); // p0 -> three in a row threat
    threat.player = 0;
    const threatScore = heuristic(threat);
    expect(threatScore).toBeGreaterThan(centerScore);
  });
});
