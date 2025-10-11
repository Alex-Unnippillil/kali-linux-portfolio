import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Radare2 from '../components/apps/radare2';
import fixtures from '../apps/radare2/fixtures.json';

describe('Radare2 tutorial', () => {
  beforeEach(() => {
    window.localStorage.setItem('r2HelpDismissed', 'true');
    window.localStorage.removeItem('radare2:lab-enabled');
  });

  it('opens tutorial from help menu', () => {
    render(<Radare2 initialData={fixtures} />);
    expect(screen.queryByText('Radare2 Tutorial')).toBeNull();
    fireEvent.click(screen.getByText('Help'));
    expect(screen.getByText('Radare2 Tutorial')).toBeInTheDocument();
  });
});
