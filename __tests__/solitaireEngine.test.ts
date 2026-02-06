import {
  initializeGame,
  drawFromStock,
  moveTableauToTableau,
  moveWasteToTableau,
  moveToFoundation,
  autoMove,
  autoComplete,
  isWin,
  suits,
  Card,
  GameState,
  createDeck,
  findHint,
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
  redeals: 3,
});

describe('Solitaire engine', () => {
  test('createDeck supports deterministic seed', () => {
    const a = createDeck(1234);
    const b = createDeck(1234);
    expect(a).toEqual(b);
    const c = createDeck(5678);
    expect(a).not.toEqual(c);
  });

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
    const recycled = drawFromStock({ ...afterDraw, stock: [], waste: afterDraw.waste, redeals: 3 });
    expect(recycled.stock.length).toBe(afterDraw.waste.length);
    expect(recycled.waste.length).toBe(0);
    expect(recycled.stock.every((c) => !c.faceUp)).toBe(true);
    expect(recycled.redeals).toBe(2);
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

  test('moveTableauToTableau rejects invalid runs', () => {
    const state = emptyState();
    state.tableau[0] = [card('♠', 8, true), card('♣', 7, true), card('♣', 6, true)];
    state.tableau[1] = [card('♥', 9, true)];
    const result = moveTableauToTableau(state, 0, 0, 1);
    expect(result.tableau[0].length).toBe(3);
    expect(result.tableau[1].length).toBe(1);
  });

  test('moveTableauToTableau allows valid runs', () => {
    const state = emptyState();
    state.tableau[0] = [card('♠', 7, true), card('♥', 6, true), card('♣', 5, true)];
    state.tableau[1] = [card('♥', 8, true)];
    const result = moveTableauToTableau(state, 0, 0, 1);
    expect(result.tableau[0].length).toBe(0);
    expect(result.tableau[1].length).toBe(4);
    expect(result.tableau[1][1]).toEqual(card('♠', 7, true));
    expect(result.tableau[1][3]).toEqual(card('♣', 5, true));
  });

  test('moveWasteToTableau enforces rules', () => {
    const state = emptyState();
    state.waste = [card('♠', 5, true)];
    state.tableau[0] = [card('♥', 6, true)];
    let r = moveWasteToTableau(state, 0);
    expect(r.tableau[0].length).toBe(2);
    const state2 = emptyState();
    state2.waste = [card('♠', 5, true)];
    state2.tableau[0] = [card('♠', 6, true)];
    r = moveWasteToTableau(state2, 0);
    expect(r.tableau[0].length).toBe(1);
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

  test('autoComplete moves all possible cards to foundation', () => {
    const state = emptyState();
    state.foundations[suits.indexOf('♠')] = [card('♠', 1, true), card('♠', 2, true)];
    state.waste = [card('♠', 3, true)];
    state.tableau[0] = [card('♠', 4, true)];
    const r = autoComplete(state);
    expect(r.foundations[suits.indexOf('♠')].length).toBe(4);
    expect(r.waste.length).toBe(0);
    expect(r.tableau[0].length).toBe(0);
  });

  test('isWin detects completed game', () => {
    const state = emptyState();
    suits.forEach((s, i) => {
      state.foundations[i] = Array.from({ length: 13 }, (_, v) => card(s, v + 1, true));
    });
    expect(isWin(state)).toBe(true);
  });

  test('findHint locates a playable card', () => {
    const state = emptyState();
    state.waste = [card('♠', 1, true)];
    const hint = findHint(state);
    expect(hint).toEqual({ source: 'waste', pile: -1, index: 0 });
  });
});
