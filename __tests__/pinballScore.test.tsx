import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import Pinball from '../apps/pinball';
import { __world, __rules, __emit, __state } from '../tests/helpers/pinball-world-mock';
jest.mock('../apps/pinball/physics', () => require('../tests/helpers/pinball-world-mock'));
jest.mock('../apps/pinball/audio', () => ({ createPinballAudio: () => ({ unlock: jest.fn(), play: jest.fn(), suspend: jest.fn(), destroy: jest.fn(), setMuted: jest.fn() }) }));

describe('Pinball score and ball lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  it('persists a high score and preserves legacy scores and layouts', () => {
    localStorage.setItem('pinball-highscores', JSON.stringify({ classic: 100 }));
    localStorage.setItem('pinball-layouts', '{"classic":{"bumpers":[]}}');
    const { unmount } = render(<Pinball />);
    expect(screen.getByText('HI 000100')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Launch ball' }));
    act(() => { __rules().hit('target', 0); __emit(); });
    expect(screen.getByLabelText('Score')).toHaveTextContent('000250');
    expect(localStorage.getItem('highscore:pinball')).toBe('250');
    unmount(); render(<Pinball />);
    expect(screen.getByText('HI 000250')).toBeInTheDocument();
    expect(localStorage.getItem('pinball-layouts')).toBe('{"classic":{"bumpers":[]}}');
  });
  it('launches atomically and never consumes two lives for duplicate drains', () => {
    render(<Pinball />);
    const launch = screen.getByRole('button', { name: 'Launch ball' });
    fireEvent.click(launch); fireEvent.click(launch);
    expect(__world().launchBall).toHaveBeenCalledTimes(1);
    expect(__world().launchBall).toHaveBeenCalledWith(0.8);
    act(() => { __rules().advance(8); __rules().drain(); __rules().drain(); __emit(); });
    expect(screen.getByText('Balls: 2')).toBeInTheDocument();
    expect(launch).toBeEnabled();
    for (let life = 0; life < 2; life += 1) {
      fireEvent.click(launch);
      act(() => { __rules().advance(8); __rules().drain(); __emit(); });
    }
    expect(screen.getByRole('heading', { name: 'Game over' })).toBeInTheDocument();
    expect(launch).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    expect(screen.getByText('Balls: 3')).toBeInTheDocument();
    expect(__world().resetGame).toHaveBeenCalledTimes(1);
  });
  it('confirms a restart and never discards the best score', () => {
    render(<Pinball />);
    act(() => __state({ score: 150, phase: 'playing' }));
    fireEvent.click(screen.getByRole('button', { name: 'New game' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(__world().resetGame).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Start new game' }));
    expect(screen.getByLabelText('Score')).toHaveTextContent('000000');
    expect(screen.getByText('HI 000150')).toBeInTheDocument();
  });
  it('survives corrupt settings and unavailable storage', () => {
    localStorage.setItem('pinball-settings-v2', '{broken');
    localStorage.setItem('highscore:pinball', 'Infinity');
    const { unmount } = render(<Pinball />);
    expect(screen.getByText('HI 000000')).toBeInTheDocument();
    unmount();
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    render(<Pinball />);
    expect(screen.getByRole('button', { name: 'Launch ball' })).toBeEnabled();
  });
});
