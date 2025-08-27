import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Beef from '../components/apps/beef';

describe('BeEF app fixtures', () => {
  beforeEach(() => {
    window.localStorage.setItem('beefHelpDismissed', 'true');
    (global as any).fetch = jest.fn(() => Promise.reject(new Error('network')));
  });

  it('shows fixture hook info and runs module using fixtures', async () => {
    render(<Beef />);
    const hook = await screen.findByText('Demo Browser');
    fireEvent.click(hook);
    expect(screen.getByText('127.0.0.1')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'alert' } });
    fireEvent.click(screen.getByText('Run Module'));
    expect(await screen.findByText('Alert executed.')).toBeInTheDocument();
  });
});
