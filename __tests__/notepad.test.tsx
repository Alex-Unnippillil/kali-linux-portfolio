import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Notepad from '../apps/notepad';

const STORAGE_KEY = 'kali-notepad-notes';

describe('Notepad app', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('loads the default About Me note', () => {
    render(<Notepad />);

    expect(screen.getByDisplayValue('About Me')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(/Hey there! 👋/i),
    ).toBeInTheDocument();
  });

  it('creates a new note', async () => {
    const user = userEvent.setup();
    render(<Notepad />);

    await user.click(screen.getByRole('button', { name: 'New' }));

    expect(screen.getByDisplayValue('Untitled Note')).toBeInTheDocument();
  });

  it('persists notes to localStorage', async () => {
    const user = userEvent.setup();
    render(<Notepad />);

    const textarea = screen.getByLabelText('Note content');
    await user.clear(textarea);
    await user.type(textarea, 'Remember to check the portfolio apps.');

    await waitFor(() => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      expect(stored).toContain('Remember to check the portfolio apps.');
    });
  });
});
