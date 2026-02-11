import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Snake from '../components/apps/snake';

jest.mock('../hooks/useIsTouchDevice', () => () => false);

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    clearRect: jest.fn(),
    createLinearGradient: () => ({ addColorStop: jest.fn() }),
    createRadialGradient: () => ({ addColorStop: jest.fn() }),
    fillRect: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    drawImage: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    strokeRect: jest.fn(),
    setLineDash: jest.fn(),
  })) as any;
});

describe('Snake UI', () => {
  it('renders board and settings controls', () => {
    render(<Snake windowMeta={{ isFocused: true }} />);
    fireEvent.click(screen.getByLabelText('Settings'));

    expect(screen.getByLabelText('Snake game board')).toBeInTheDocument();
    expect(screen.getByLabelText('Wrap')).toBeInTheDocument();
  });

  it('toggling wrap updates localStorage', () => {
    render(<Snake windowMeta={{ isFocused: true }} />);
    fireEvent.click(screen.getByLabelText('Settings'));
    const wrap = screen.getByLabelText('Wrap') as HTMLInputElement;
    fireEvent.click(wrap);

    expect(window.localStorage.getItem('snake:wrap')).toBe('true');
  });

  it('rejects malformed replay import json without crashing', () => {
    render(<Snake windowMeta={{ isFocused: true }} />);
    fireEvent.click(screen.getByLabelText('Settings'));
    fireEvent.change(screen.getByLabelText('Replay import JSON'), {
      target: { value: '{bad-json' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }));

    expect(screen.getByText('Invalid replay JSON.')).toBeInTheDocument();
  });

  it('shows reduced motion overlay and does not auto-run', () => {
    render(<Snake windowMeta={{ isFocused: true }} />);
    expect(
      screen.getByText('Reduced motion is enabled. Press Resume to play.'),
    ).toBeInTheDocument();
  });
});
