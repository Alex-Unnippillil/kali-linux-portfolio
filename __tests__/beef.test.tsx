import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
jest.mock('react-cytoscapejs', () => () => null);
jest.mock('../components/apps/beef/HookGraph', () => () => null);
beforeAll(() => {
  (global as any).URL.createObjectURL = () => '';
});
import Beef from '../components/apps/beef';

describe('BeEF app', () => {
  beforeEach(() => {
    // hide help overlay and lab modal
    window.localStorage.setItem('beefHelpDismissed', 'true');
    window.localStorage.setItem('beef-lab-ok', 'true');
    (global as any).fetch = jest.fn();
  });

  it('updates hook list when refresh is clicked', async () => {
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
        return Promise.resolve({ json: () => Promise.resolve({ modules: [] }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<Beef />);
    // initial hooks fetch
    expect(await screen.findByText('1')).toBeInTheDocument();
    expect(screen.queryByText('2')).toBeNull();

    fireEvent.click(screen.getByText('Refresh'));

    expect(await screen.findByText('2')).toBeInTheDocument();
  });

  it('shows module output when run', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.endsWith('/demo-data/beef/hooks.json')) {
        return Promise.resolve({ json: () => Promise.resolve({ hooked_browsers: [{ id: '1' }] }) });
      }
      if (url.endsWith('/demo-data/beef/modules.json')) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              modules: [
                {
                  id: 'cat',
                  name: 'Category',
                  children: [
                    { id: 'mod1', name: 'Module 1', output: 'chunk1chunk2' },
                  ],
                },
              ],
            }),
        });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<Beef />);
    fireEvent.click(await screen.findByText('1'));
    fireEvent.click(screen.getByText('Category'));
    fireEvent.click(screen.getByText('Module 1'));
    fireEvent.click(screen.getByText('Run Module'));

    expect(await screen.findByText('chunk1chunk2')).toBeInTheDocument();
  });

  it('switches between modules and payload builder tabs', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.endsWith('/demo-data/beef/hooks.json')) {
        return Promise.resolve({ json: () => Promise.resolve({ hooked_browsers: [{ id: '1' }] }) });
      }
      if (url.endsWith('/demo-data/beef/modules.json')) {
        return Promise.resolve({ json: () => Promise.resolve({ modules: [] }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<Beef />);
    fireEvent.click(await screen.findByText('1'));
    const payloadTab = screen.getByRole('tab', { name: 'Payload Builder' });
    expect(screen.getByPlaceholderText('Enter JS payload...')).not.toBeVisible();
    fireEvent.click(payloadTab);
    expect(screen.getByPlaceholderText('Enter JS payload...')).toBeVisible();
  });
});
