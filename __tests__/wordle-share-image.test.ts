import { generateWordleShareImageData, WORDLE_SHARE_LAYOUT } from '../games/wordle/shareImage';
import type { GuessEntry } from '../games/wordle/logic';

const sampleGuesses: GuessEntry[] = [
  {
    guess: 'CRANE',
    result: ['present', 'absent', 'absent', 'absent', 'absent'],
  },
  {
    guess: 'LIGHT',
    result: ['absent', 'correct', 'absent', 'absent', 'present'],
  },
  {
    guess: 'MOUSE',
    result: ['correct', 'correct', 'correct', 'correct', 'correct'],
  },
];

const pixelAt = (
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): [number, number, number, number] => {
  const idx = (y * width + x) * 4;
  return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
};

describe('Wordle share image generation', () => {
  it('produces the configured canvas dimensions', () => {
    const image = generateWordleShareImageData(sampleGuesses);
    expect(image.width).toBe(WORDLE_SHARE_LAYOUT.width);
    expect(image.height).toBe(WORDLE_SHARE_LAYOUT.height);
  });

  it('encodes board colors for each result state', () => {
    const image = generateWordleShareImageData(sampleGuesses);
    const { board } = WORDLE_SHARE_LAYOUT;

    const centerOf = (row: number, col: number) => ({
      x: Math.floor(
        board.x + col * (board.cellSize + board.gap) + board.cellSize / 2,
      ),
      y: Math.floor(
        board.y + row * (board.cellSize + board.gap) + board.cellSize / 2,
      ),
    });

    const { x: correctX, y: correctY } = centerOf(2, 0);
    const correctPixel = pixelAt(image.data, image.width, correctX, correctY);
    expect(correctPixel).toEqual([22, 163, 74, 255]);

    const { x: presentX, y: presentY } = centerOf(1, 4);
    const presentPixel = pixelAt(image.data, image.width, presentX, presentY);
    expect(presentPixel).toEqual([234, 179, 8, 255]);

    const { x: absentX, y: absentY } = centerOf(0, 1);
    const absentPixel = pixelAt(image.data, image.width, absentX, absentY);
    expect(absentPixel).toEqual([75, 85, 99, 255]);

    const { x: emptyX, y: emptyY } = centerOf(5, 0);
    const emptyPixel = pixelAt(image.data, image.width, emptyX, emptyY);
    expect(emptyPixel).toEqual([17, 24, 39, 255]);

    const backgroundPixel = pixelAt(image.data, image.width, 2, 2);
    expect(backgroundPixel).toEqual([15, 19, 23, 255]);
  });
});

