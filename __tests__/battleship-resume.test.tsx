import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import BattleshipApp from '../components/apps/battleship/BattleshipApp';

jest.mock('react-draggable', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockMatchMedia = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      media: query,
      matches: false,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }),
  });
};

const toCoord = (idx: number) => {
  const letter = String.fromCharCode(65 + (idx % 10));
  const row = Math.floor(idx / 10) + 1;
  return `${letter}${row}`;
};

describe('Battleship resume session', () => {
  beforeEach(() => {
    localStorage.clear();
    mockMatchMedia();
    jest.spyOn(Date, 'now').mockReturnValue(1690000000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('prompts to resume and restores the previous salvo', () => {
    const first = render(<BattleshipApp />);

    fireEvent.click(screen.getByRole('button', { name: /Begin Battle/i }));
    const target = screen.getAllByRole('button', { name: /Select target at/i })[0];
    fireEvent.click(target);
    fireEvent.click(screen.getByRole('button', { name: /Fire Salvo/i }));

    const saved = JSON.parse(localStorage.getItem('battleship-session') || 'null');
    const lastShot = saved.players[1].lastShots[0];
    first.unmount();

    render(<BattleshipApp />);

    expect(screen.getByRole('dialog', { name: /Resume last battle/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Resume battle/i }));

    expect(screen.queryByRole('dialog', { name: /Resume last battle/i })).not.toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${toCoord(lastShot)}\\s+(Hit|Miss)`))).toBeInTheDocument();
  });

  it('can discard saved session and start fresh', () => {
    const first = render(<BattleshipApp />);
    fireEvent.click(screen.getByRole('button', { name: /Begin Battle/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /Select target at/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /Fire Salvo/i }));
    first.unmount();

    const resumed = render(<BattleshipApp />);
    fireEvent.click(screen.getByRole('button', { name: /Start new battle/i }));

    expect(localStorage.getItem('battleship-session')).toContain('\"phase\":\"placement\"');

    resumed.unmount();
    render(<BattleshipApp />);
    expect(screen.queryByRole('dialog', { name: /Resume last battle/i })).not.toBeInTheDocument();
  });
});
