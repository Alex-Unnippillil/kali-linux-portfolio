import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsDrawer from '../components/SettingsDrawer';

describe('Settings drawer focus management', () => {
  it('returns focus to the trigger when closed', () => {
    render(<SettingsDrawer />);
    const button = screen.getByRole('button', { name: /settings/i });
    button.focus();

    fireEvent.click(button);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const themeSelect = screen.getByLabelText('theme-select');
    themeSelect.focus();

    fireEvent.click(button);
    expect(button).toHaveFocus();
  });
});
