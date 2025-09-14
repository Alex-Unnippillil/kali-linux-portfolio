import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react';
import WeeklyCards from '../components/WeeklyCards';

describe('WeeklyCards', () => {
  const cards = [
    { title: 'Card 1', description: 'First' },
    { title: 'Card 2', description: 'Second' },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('auto-rotates cards', () => {
    render(<WeeklyCards cards={cards} />);
    expect(screen.getByText('Card 1')).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(6000);
    });
    expect(screen.getByText('Card 2')).toBeInTheDocument();
  });

  test('pin stops rotation', async () => {
    render(<WeeklyCards cards={cards} />);
    fireEvent.click(screen.getByRole('button', { name: /pin/i }));
    act(() => {
      jest.advanceTimersByTime(6000);
    });
    expect(screen.getByText('Card 1')).toBeInTheDocument();
  }, 10000);

  test('focus pauses rotation', () => {
    render(<WeeklyCards cards={cards} />);
    const container = screen.getByTestId('weekly-card');
    act(() => {
      fireEvent.focus(container);
    });
    act(() => {
      jest.advanceTimersByTime(6000);
    });
    expect(screen.getByText('Card 1')).toBeInTheDocument();
  });
});
