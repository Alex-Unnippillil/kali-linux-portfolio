import {
  initializeGame,
  drawFromStock,
  moveTableauToTableau,
  moveWasteToTableau,
  moveToFoundation,
  autoMove,
  suits,
  Card,
  GameState,
} from '../components/apps/solitaire/engine';

const card = (s: any, v: number, faceUp = true): Card => ({
  suit: s,
  value: v,
  color: s === '♠' || s === '♣' ? 'black' : 'red',
  faceUp,
});

const emptyState = (): GameState => ({
  tableau: Array.from({ length: 7 }, () => []),
  stock: [],
  waste: [],
  foundations: Array.from({ length: 4 }, () => []),
  draw: 1,
  score: 0,
});

describe('Solitaire engine', () => {
  test('initializeGame deals tableau correctly', () => {
    const game = initializeGame(1, Array.from({ length: 52 }, (_, i) => card(suits[i % 4], (i % 13) + 1, false)));
    expect(game.tableau.length).toBe(7);
    game.tableau.forEach((pile, i) => {
      expect(pile.length).toBe(i + 1);
      expect(pile[pile.length - 1].faceUp).toBe(true);
    });
    const total = game.tableau.reduce((a, p) => a + p.length, 0) + game.stock.length;
    expect(total).toBe(52);
  });

  test('drawFromStock handles draw3 and recycle', () => {
    let game = initializeGame(3, Array.from({ length: 52 }, (_, i) => card(suits[i % 4], (i % 13) + 1, false)));
    const afterDraw = drawFromStock(game);
    expect(afterDraw.waste.length).toBe(3);
    expect(afterDraw.stock.length).toBe(game.stock.length - 3);
    const recycled = drawFromStock({ ...afterDraw, stock: [], waste: afterDraw.waste });
    expect(recycled.stock.length).toBe(afterDraw.waste.length);
    expect(recycled.waste.length).toBe(0);
    expect(recycled.stock.every((c) => !c.faceUp)).toBe(true);
  });

  test('moveTableauToTableau obeys rules and flips card', () => {
    const state = emptyState();
    state.tableau[0] = [card('♠', 13, true)];
    state.tableau[1] = [];
    let result = moveTableauToTableau(state, 0, 0, 1);
    expect(result.tableau[1].length).toBe(1);
    expect(result.tableau[0].length).toBe(0);
    // Invalid move same color
    const state2 = emptyState();
    state2.tableau[0] = [card('♠', 12, true)];
    state2.tableau[1] = [card('♣', 11, true)];
    result = moveTableauToTableau(state2, 0, 0, 1);
    expect(result.tableau[0].length).toBe(1);
    expect(result.tableau[1].length).toBe(1);
  });

  test('moveToFoundation builds correctly', () => {
    const state = emptyState();
    state.tableau[0] = [card('♠', 1, true)];
    let r = moveToFoundation(state, 'tableau', 0);
    expect(r.foundations[suits.indexOf('♠')].length).toBe(1);
    state.tableau[0] = [card('♠', 2, true)];
    r = moveToFoundation(state, 'tableau', 0);
    expect(r.tableau[0].length).toBe(1);
  });

  test('autoMove moves aces from waste', () => {
    const state = emptyState();
    state.waste = [card('♦', 1, true)];
    const r = autoMove(state, 'waste', null);
    expect(r.foundations[suits.indexOf('♦')].length).toBe(1);
  });
});
