import { render, screen, fireEvent } from '@testing-library/react';
import wordList from '../components/apps/wordle_words.json';
import { getDailySeed } from '../utils/dailyChallenge';
import type { ComponentType } from 'react';

let Wordle: ComponentType;

const hash = (str: string) => {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(31, h) + str.charCodeAt(i);
  }
  return Math.abs(h);
};

describe('Wordle', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00Z'));
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn() },
    });
    localStorage.clear();
    Wordle = require('../components/apps/wordle').default;
  });
  afterEach(() => {
    jest.clearAllTimers();
  });

  test('solves puzzle, shows keyboard hints, and shares result', async () => {
    render(<Wordle />);
    const seed = getDailySeed('wordle-common', new Date('2024-01-01T00:00:00Z'));
    const solution = wordList[hash(seed) % wordList.length];
    const input = screen.getByPlaceholderText('Guess');
    fireEvent.change(input, { target: { value: solution } });
    fireEvent.submit(input.closest('form')!);
    const key = await screen.findByRole('button', {
      name: `${solution[0]} correct`,
    });
    expect(key).toBeInTheDocument();
    expect(screen.getByText('Wordle 1/6')).toBeInTheDocument();
    const shareBtn = screen.getByText('Share');
    fireEvent.click(shareBtn);
    expect((navigator as any).clipboard.writeText).toHaveBeenCalled();
  });

  test('enforces hard mode rules', async () => {
    render(<Wordle />);
    const hardToggle = screen.getByLabelText('Hard Mode');
    fireEvent.click(hardToggle);

    const input = screen.getByPlaceholderText('Guess');
    fireEvent.change(input, { target: { value: 'ABDOM' } });
    fireEvent.submit(input.closest('form')!);

    fireEvent.change(input, { target: { value: 'AAHED' } });
    fireEvent.submit(input.closest('form')!);

    const status = await screen.findByRole('status');
    expect(status.textContent).toMatch(/Hard mode:/);
  });
});
