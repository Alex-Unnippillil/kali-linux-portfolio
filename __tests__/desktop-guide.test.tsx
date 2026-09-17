import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DesktopGuide from '../components/desktop/DesktopGuide';
jest.mock('../hooks/useIsTouchDevice', () => ({ __esModule: true, default: () => true }));
beforeEach(() => localStorage.clear());
test('first visit remains in the desktop with optional, dismissible tips', () => {
  render(<><main>My desktop</main><DesktopGuide /></>);
  expect(screen.getByText('My desktop')).toBeVisible();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.queryByRole('complementary', { name: 'Using this desktop' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Desktop tips' }));
  expect(screen.getByRole('complementary', { name: 'Using this desktop' })).toBeVisible();
  expect(screen.getByText('Touch is ready too')).toBeVisible();
  fireEvent.keyDown(screen.getByRole('button', { name: 'Close desktop tips' }), { key: 'Escape' });
  expect(screen.getByRole('button', { name: 'Desktop tips' })).toHaveFocus();
  expect(localStorage.getItem('kali:desktop-guide:v1')).toBe('seen');
});
test('dismissing the first-visit hint leaves help available', () => {
  render(<DesktopGuide />);
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss desktop hint' }));
  expect(screen.queryByRole('button', { name: 'Dismiss desktop hint' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Desktop tips' })).toBeVisible();
});
