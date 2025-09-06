import React from 'react';
import { render, screen, act } from '@testing-library/react';
import ChangeLog from '../components/settings/ChangeLog';
import settingsBus from '../utils/settingsBus';

describe('ChangeLog', () => {
  it('logs settings changes', () => {
    render(<ChangeLog />);
    act(() => {
      settingsBus.publish('ui', 'theme', 'dark');
    });
    expect(screen.getByRole('log')).toHaveTextContent('[ui] theme: dark');
  });
});
