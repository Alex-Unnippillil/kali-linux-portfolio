import type { ScoreBreakdown } from './types';

const LINE_SCORES = [0, 100, 300, 500, 800];
const TSPIN_SCORES = [0, 400, 800, 1200, 1600];
const PERFECT_CLEAR_BONUS = 2000;

interface ScoreArgs {
  linesCleared: number;
  level: number;
  isTSpin: boolean;
  isB2B: boolean;
  combo: number;
  perfectClear: boolean;
}

export const computeLineClearScore = ({
  linesCleared,
  level,
  isTSpin,
  isB2B,
  combo,
  perfectClear,
}: ScoreArgs): ScoreBreakdown => {
  if (linesCleared === 0) {
    return { base: 0, combo: 0, b2b: 0, perfectClear: 0, total: 0 };
  }
  const baseTable = isTSpin ? TSPIN_SCORES : LINE_SCORES;
  const base = (baseTable[linesCleared] || 0) * Math.max(level, 1);
  const b2b = isB2B ? Math.floor(base * 0.5) : 0;
  const comboBonus = combo > 1 ? combo * 50 : 0;
  const perfectClearBonus = perfectClear ? PERFECT_CLEAR_BONUS : 0;
  const total = base + b2b + comboBonus + perfectClearBonus;
  return {
    base,
    combo: comboBonus,
    b2b,
    perfectClear: perfectClearBonus,
    total,
  };
};
