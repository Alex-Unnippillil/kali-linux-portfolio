import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
jest.mock('react-cytoscapejs', () => () => null);
jest.mock('../components/apps/beef/HookGraph', () => () => null);

import Beef from '../components/apps/beef';

describe('BeEF app', () => {
  beforeEach(() => {
    window.localStorage.setItem('beefHelpDismissed', 'true');
    (global as any).fetch = jest.fn();
  });

  it('refreshes hooks and runs modules from demo data', async () => {
    const hookResponses = [
      { hooked_browsers: [{ id: '1' }] },
      { hooked_browsers: [{ id: '1' }, { id: '2' }] },
    ];
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.endsWith('/demo-data/beef/hooks.json')) {
        const data = hookResponses.shift();
        return Promise.resolve({ json: () => Promise.resolve(data) });
      }
      if (url.endsWith('/demo-data/beef/modules.json')) {
        return Promise.resolve({ json: () => Promise.resolve({ modules: [{ id: 'mod1', name: 'Module 1', output: 'out' }] }) });
      }
      if (url.endsWith('/demo-data/beef/events.json')) {
        return Promise.resolve({ json: () => Promise.resolve({ events: [] }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<Beef />);
    expect(await screen.findByText('1')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Refresh'));
    expect(await screen.findByText('2')).toBeInTheDocument();

    fireEvent.click(screen.getByText('1'));
    fireEvent.change(await screen.findByRole('combobox'), { target: { value: 'mod1' } });
    fireEvent.click(screen.getByText('Run Module'));
    expect(await screen.findByText('out')).toBeInTheDocument();
  });
});
