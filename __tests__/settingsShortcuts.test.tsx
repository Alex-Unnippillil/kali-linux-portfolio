import React from 'react';
import { render, screen } from '@testing-library/react';
import Settings from '../components/apps/settings';

describe('Settings keyboard shortcuts', () => {
  beforeEach(() => {
    window.localStorage.setItem(
      'keymap',
      JSON.stringify({
        'Show keyboard shortcuts': 'Ctrl+K',
        'Open settings': 'Ctrl+K',
      })
    );
  });

  afterEach(() => {
    window.localStorage.removeItem('keymap');
  });

  it('shows conflict labels when bindings collide', () => {
    render(<Settings />);

    expect(screen.getAllByText('Conflict')).toHaveLength(2);
  });
});
