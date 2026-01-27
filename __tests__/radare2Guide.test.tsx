import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Radare2 from '../components/apps/radare2';
import sample from '../apps/radare2/sample.json';

describe('Radare2 tutorial', () => {
  beforeEach(() => {
    window.localStorage.setItem('r2HelpDismissed', 'true');
  });

  it('opens tutorial from help menu', () => {
    render(<Radare2 initialData={sample} />);
    expect(screen.queryByText('Radare2 Tutorial')).toBeNull();
    fireEvent.click(screen.getByText('Help'));
    expect(screen.getByText('Radare2 Tutorial')).toBeInTheDocument();
  });

  it('persists dont show again selection', () => {
    render(<Radare2 initialData={sample} />);
    fireEvent.click(screen.getByText('Help'));

    const checkbox = screen.getByRole('checkbox', { name: /don't show again/i });
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(window.localStorage.getItem('r2HelpDismissed')).toBe('true');
  });
});
