import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '../components/providers/ThemeProvider';
import Radare2 from '../components/apps/radare2';
import sample from '../apps/radare2/sample.json';

describe('Radare2 tutorial', () => {
  beforeEach(() => {
    window.localStorage.setItem('r2HelpDismissed', 'true');
  });

  it('opens tutorial from help menu', () => {
    render(
      <ThemeProvider>
        <Radare2 initialData={sample} />
      </ThemeProvider>,
    );
    expect(screen.queryByText('Radare2 Tutorial')).toBeNull();
    fireEvent.click(screen.getByText('Help'));
    expect(screen.getByText('Radare2 Tutorial')).toBeInTheDocument();
  });
});
