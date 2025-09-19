import {
  type GameState,
  drawFromStock,
  moveWasteToTableau,
  moveTableauToTableau,
  moveToFoundation,
  isWin,
} from './engine';

export type SolverMove =
  | { type: 'draw' }
  | { type: 'wasteToFoundation' }
  | { type: 'tableauToFoundation'; from: number }
  | { type: 'wasteToTableau'; to: number }
  | { type: 'tableauToTableau'; from: number; index: number; to: number };

export const solve = (
  initial: GameState,
  maxSteps = 1000,
): SolverMove[] => {
  const moves: SolverMove[] = [];
  let state = initial;

  for (let step = 0; step < maxSteps && !isWin(state); step += 1) {
    // Waste to foundation
    let next = moveToFoundation(state, 'waste', null);
    if (next !== state) {
      moves.push({ type: 'wasteToFoundation' });
      state = next;
      continue;
    }
    // Tableau to foundation
    let moved = false;
    for (let i = 0; i < state.tableau.length; i += 1) {
      next = moveToFoundation(state, 'tableau', i);
      if (next !== state) {
        moves.push({ type: 'tableauToFoundation', from: i });
        state = next;
        moved = true;
        break;
      }
    }
    if (moved) continue;
    // Waste to tableau
    for (let i = 0; i < state.tableau.length; i += 1) {
      next = moveWasteToTableau(state, i);
      if (next !== state) {
        moves.push({ type: 'wasteToTableau', to: i });
        state = next;
        moved = true;
        break;
      }
    }
    if (moved) continue;
    // Tableau to tableau
    for (let from = 0; from < state.tableau.length && !moved; from += 1) {
      const pile = state.tableau[from];
      for (let index = 0; index < pile.length; index += 1) {
        if (!pile[index].faceUp) continue;
        for (let to = 0; to < state.tableau.length; to += 1) {
          if (to === from) continue;
          next = moveTableauToTableau(state, from, index, to);
          if (next !== state) {
            moves.push({ type: 'tableauToTableau', from, index, to });
            state = next;
            moved = true;
            break;
          }
        }
        if (moved) break;
      }
    }
    if (moved) continue;
    // Draw from stock
    next = drawFromStock(state);
    if (next === state) break;
    moves.push({ type: 'draw' });
    state = next;
  }
  return moves;
};

export default solve;

