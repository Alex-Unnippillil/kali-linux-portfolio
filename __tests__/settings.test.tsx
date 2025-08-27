import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '../hooks/useTheme';
import { Settings } from '../components/apps/settings';

const renderSettings = () =>
  render(
    <ThemeProvider>
      <Settings changeBackgroundImage={() => {}} currBgImgName="wall-1" />
    </ThemeProvider>
  );

describe('Settings app', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists toggles across reloads', () => {
    const { unmount } = renderSettings();
    const themeToggle = screen.getByLabelText('Dark theme');
    const soundToggle = screen.getByLabelText('Sound effects');
    const motionToggle = screen.getByLabelText('Reduced motion');

    fireEvent.click(themeToggle);
    fireEvent.click(soundToggle);
    fireEvent.click(motionToggle);

    unmount();

    renderSettings();

    expect(screen.getByLabelText('Dark theme')).not.toBeChecked();
    expect(screen.getByLabelText('Sound effects')).not.toBeChecked();
    expect(screen.getByLabelText('Reduced motion')).toBeChecked();
  });

  it('reset clears keys and displays toast', () => {
    localStorage.setItem('dummy', '1');
    renderSettings();
    fireEvent.click(screen.getByText('Reset apps'));
    expect(localStorage.getItem('dummy')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Apps reset');
  });
});
