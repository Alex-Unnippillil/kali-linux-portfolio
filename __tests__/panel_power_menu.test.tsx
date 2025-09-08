import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import Panel from '../src/components/panel/Panel';

jest.mock('react-dnd', () => ({
  DndProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useDrag: () => [{ isDragging: false }, () => {}],
  useDrop: () => [{}, () => {}],
}));

jest.mock('react-dnd-html5-backend', () => ({}));
jest.mock('../src/components/panel/PanelPreferences', () => ({
  usePanelPreferences: () => ({ editMode: false, locked: false }),
}));

function navigateToPower(getByRole: any, getByText: any) {
  const panel = getByRole('toolbar', { name: 'Panel' });
  panel.focus();
  fireEvent.keyDown(panel, { key: 'ArrowRight' });
  const first = getByText('Plugin A');
  fireEvent.keyDown(first, { key: 'ArrowRight' });
  const second = getByText('Plugin B');
  fireEvent.keyDown(second, { key: 'ArrowRight' });
  const third = getByText('Plugin C');
  fireEvent.keyDown(third, { key: 'ArrowRight' });
  const power = getByText('Power');
  return { panel, power };
}

describe('panel power menu', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('is keyboard navigable', () => {
    const { getByRole, getByText } = render(<Panel />);
    const { power } = navigateToPower(getByRole, getByText);
    fireEvent.keyDown(power, { key: 'Enter' });
    const restart = getByText('Restart');
    expect(restart).toHaveFocus();
    fireEvent.keyDown(restart, { key: 'ArrowDown' });
    const logout = getByText('Log Out');
    expect(logout).toHaveFocus();
    fireEvent.keyDown(logout, { key: 'ArrowDown' });
    const theme = getByText('Theme');
    expect(theme).toHaveFocus();
    fireEvent.keyDown(theme, { key: 'ArrowUp' });
    expect(logout).toHaveFocus();
    fireEvent.keyDown(logout, { key: 'Escape' });
    expect(document.activeElement).toBe(power);
  });

  it('reloads on restart', () => {
    const listener = jest.fn();
    window.addEventListener('power-restart', listener);
    const { getByRole, getByText } = render(<Panel />);
    const { power } = navigateToPower(getByRole, getByText);
    fireEvent.keyDown(power, { key: 'Enter' });
    const restart = getByText('Restart');
    fireEvent.keyDown(restart, { key: 'Enter' });
    fireEvent.keyUp(restart, { key: 'Enter' });
    fireEvent.click(restart);
    expect(listener).toHaveBeenCalled();
  });

  it('clears storage on log out', () => {
    const { getByRole, getByText } = render(<Panel />);
    window.localStorage.setItem('foo', 'bar');
    const { power } = navigateToPower(getByRole, getByText);
    fireEvent.keyDown(power, { key: 'Enter' });
    const restart = getByText('Restart');
    fireEvent.keyDown(restart, { key: 'ArrowDown' });
    const logout = getByText('Log Out');
    fireEvent.keyDown(logout, { key: 'Enter' });
    fireEvent.keyUp(logout, { key: 'Enter' });
    fireEvent.click(logout);
    expect(window.localStorage.getItem('foo')).toBeNull();
  });

  it('toggles theme', () => {
    const { getByRole, getByText } = render(<Panel />);
    const { power } = navigateToPower(getByRole, getByText);
    fireEvent.keyDown(power, { key: 'Enter' });
    const restart = getByText('Restart');
    fireEvent.keyDown(restart, { key: 'ArrowDown' });
    const logout = getByText('Log Out');
    fireEvent.keyDown(logout, { key: 'ArrowDown' });
    const theme = getByText('Theme');
    fireEvent.keyDown(theme, { key: 'Enter' });
    fireEvent.keyUp(theme, { key: 'Enter' });
    fireEvent.click(theme);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});

