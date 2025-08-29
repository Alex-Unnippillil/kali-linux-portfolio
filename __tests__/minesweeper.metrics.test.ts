import { calculate3BV, Cell } from '../games/minesweeper/metrics';

describe('calculate3BV', () => {
  it('counts numbered cells when no zero regions', () => {
    const board: Cell[][] = [
      [
        { mine: false, adjacent: 1 },
        { mine: false, adjacent: 1 },
        { mine: false, adjacent: 1 },
      ],
      [
        { mine: false, adjacent: 1 },
        { mine: true, adjacent: 0 },
        { mine: false, adjacent: 1 },
      ],
      [
        { mine: false, adjacent: 1 },
        { mine: false, adjacent: 1 },
        { mine: false, adjacent: 1 },
      ],
    ];
    expect(calculate3BV(board)).toBe(8);
  });

  it('counts zero region as one click', () => {
    const board: Cell[][] = [
      [
        { mine: true, adjacent: 0 },
        { mine: false, adjacent: 1 },
        { mine: false, adjacent: 0 },
      ],
      [
        { mine: false, adjacent: 1 },
        { mine: false, adjacent: 1 },
        { mine: false, adjacent: 0 },
      ],
      [
        { mine: false, adjacent: 0 },
        { mine: false, adjacent: 0 },
        { mine: false, adjacent: 0 },
      ],
    ];
    expect(calculate3BV(board)).toBe(1);
  });
});
