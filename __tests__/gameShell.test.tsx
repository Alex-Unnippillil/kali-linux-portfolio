import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import GameShell from '../components/apps/GameShell';

describe('GameShell settings and behaviours', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('toggles persist via usePersistedState', () => {
    const { unmount, getByLabelText } = render(<GameShell />);
    const assist = getByLabelText(/assist mode/i) as HTMLInputElement;
    expect(assist.checked).toBe(false);
    fireEvent.click(assist);
    expect(assist.checked).toBe(true);
    unmount();
    const { getByLabelText: getAgain } = render(<GameShell />);
    expect((getAgain(/assist mode/i) as HTMLInputElement).checked).toBe(true);
  });

  test('screen reader tutorial text present', () => {
    render(<GameShell />);
    expect(screen.getByRole('dialog', { name: /tutorial/i })).toBeInTheDocument();
  });

  test('auto-pause triggers on visibility change', () => {
    render(<GameShell />);
    const indicator = screen.getByTestId('pause-indicator');
    expect(indicator.textContent).toBe('running');
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    fireEvent(document, new Event('visibilitychange'));
    expect(indicator.textContent).toBe('paused');
  });
});
