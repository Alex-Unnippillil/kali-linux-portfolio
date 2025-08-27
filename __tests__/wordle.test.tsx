import { render, screen, fireEvent } from '@testing-library/react';
import wordList from '../components/apps/wordle_words.json';
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
    Wordle = require('../components/apps/wordle').default;
  });
  afterEach(() => {
    jest.clearAllTimers();
  });

  test('solves puzzle and shares result', async () => {
    render(<Wordle />);
    const todayKey = new Date().toISOString().split('T')[0];
    const solution = wordList[hash(todayKey) % wordList.length];
    const input = screen.getByPlaceholderText('Guess');
    fireEvent.change(input, { target: { value: solution } });
    fireEvent.submit(input.closest('form')!);
    const shareBtn = await screen.findByText('Share');
    fireEvent.click(shareBtn);
    expect((navigator as any).clipboard.writeText).toHaveBeenCalled();
  });
});
