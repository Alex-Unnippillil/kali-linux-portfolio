import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('Battleship UI', () => {
  beforeEach(() => {
    localStorage.clear();
    mockMatchMedia();
    jest.spyOn(Date, 'now').mockReturnValue(1690000000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('announces when placing without a selected ship', () => {
    render(<BattleshipApp />);

    const placementCell = screen.getAllByRole('button', { name: /Place ship at/i })[0];
    fireEvent.click(placementCell);

    expect(screen.getAllByText(/Select a ship before placing/i).length).toBeGreaterThan(0);
  });

  it('limits salvo target selection to available shots', () => {
    render(<BattleshipApp />);

    fireEvent.click(screen.getByLabelText(/salvo mode/i));
    fireEvent.click(screen.getByRole('button', { name: /Begin Battle/i }));

    const targetButtons = screen.getAllByRole('button', { name: /Select target at/i });
    targetButtons.slice(0, 6).forEach((btn) => fireEvent.click(btn));

    expect(screen.getByText(/Selected 5\/5/i)).toBeInTheDocument();
  });

  it('shows pass screen when switching turns in hotseat mode', () => {
    render(<BattleshipApp />);

    fireEvent.change(screen.getByLabelText(/Game Mode/i), { target: { value: 'hotseat' } });
    fireEvent.click(screen.getByRole('button', { name: /Begin Battle/i }));

    expect(screen.getByText(/Pass the device/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ready/i }));

    expect(screen.getByText(/Deployment Grid — Player 2/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Begin Battle/i }));

    fireEvent.click(screen.getByRole('button', { name: /Ready/i }));

    const targetButtons = screen.getAllByRole('button', { name: /Select target at/i });
    fireEvent.click(targetButtons[0]);
    fireEvent.click(screen.getByRole('button', { name: /Fire Salvo/i }));

    expect(screen.getAllByText(/Pass the device/i).length).toBeGreaterThan(0);
  });
});
