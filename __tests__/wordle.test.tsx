import { render, screen, fireEvent } from '@testing-library/react';
import { getWordOfTheDay, buildResultMosaic } from '../utils/wordle';
import type { ComponentType } from 'react';

let Wordle: ComponentType;


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

  test('solves puzzle and shares result', async () => {
    render(<Wordle />);
    const solution = getWordOfTheDay(
      'common',
      new Date('2024-01-01T00:00:00Z')
    );
    const input = screen.getByPlaceholderText('Guess');
    fireEvent.change(input, { target: { value: solution } });
    fireEvent.submit(input.closest('form')!);
    const shareBtn = await screen.findByText('Share');
    fireEvent.click(shareBtn);
    expect((navigator as any).clipboard.writeText).toHaveBeenCalled();
  });

  test('supports themed word packs', async () => {
    render(<Wordle />);
    const packSelect = screen.getByLabelText('Word Pack');
    fireEvent.change(packSelect, { target: { value: 'animals' } });
    const solution = getWordOfTheDay(
      'animals',
      new Date('2024-01-01T00:00:00Z')
    );
    const input = screen.getByPlaceholderText('Guess');
    fireEvent.change(input, { target: { value: solution } });
    fireEvent.submit(input.closest('form')!);
    expect(await screen.findByText('Share')).toBeInTheDocument();
  });

  test('enforces hard mode rules', async () => {
    render(<Wordle />);
    const hardToggle = screen.getByLabelText('Hard Mode');
    fireEvent.click(hardToggle);

    const input = screen.getByPlaceholderText('Guess');
    fireEvent.change(input, { target: { value: 'ABDOM' } });
    fireEvent.submit(input.closest('form')!);

    fireEvent.change(input, { target: { value: 'ACORN' } });
    fireEvent.submit(input.closest('form')!);

    expect(await screen.findByText(/Hard mode:/)).toBeInTheDocument();
  });

  test('word of the day is based on date seed', () => {
    const d1 = new Date('2024-01-01T00:00:00Z');
    const d2 = new Date('2024-01-02T00:00:00Z');
    const w1 = getWordOfTheDay('common', d1);
    const w2 = getWordOfTheDay('common', d1);
    const w3 = getWordOfTheDay('common', d2);
    expect(w1).toBe(w2);
    expect(w1).not.toBe(w3);
  });

  test('stores attempt history locally', async () => {
    render(<Wordle />);
    const solution = getWordOfTheDay(
      'common',
      new Date('2024-01-01T00:00:00Z')
    );
    const input = screen.getByPlaceholderText('Guess');
    fireEvent.change(input, { target: { value: solution } });
    fireEvent.submit(input.closest('form')!);
    await screen.findByText('Share');
    const historyRaw = localStorage.getItem('wordle-history-common');
    const history = JSON.parse(historyRaw as string);
    expect(history['2024-01-01'].solution).toBe(solution);
    expect(history['2024-01-01'].success).toBe(true);
  });

  test('builds shareable result text mosaic', () => {
    const mosaic = buildResultMosaic([
      ['correct', 'present', 'absent'] as (
        | 'correct'
        | 'present'
        | 'absent'
      )[],
      ['absent', 'correct', 'present'] as (
        | 'correct'
        | 'present'
        | 'absent'
      )[],
    ]);
    expect(mosaic).toBe('🟩🟨⬛\n⬛🟩🟨');
  });

  test('solver panel autofills input from suggestions', () => {
    render(<Wordle />);

    fireEvent.click(screen.getByLabelText('Solver'));
    expect(screen.getByText(/Remaining solutions:/)).toBeInTheDocument();

    const suggestionButtons = screen.getAllByRole('button', {
      name: /Use suggestion /,
    });
    const firstSuggestionLabel = suggestionButtons[0].textContent || '';
    const suggestedWord = firstSuggestionLabel.split(' ')[0];

    fireEvent.click(suggestionButtons[0]);

    expect(screen.getByPlaceholderText('Guess')).toHaveValue(suggestedWord);
  });
});
