import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WhiskerMenu from '../components/menu/WhiskerMenu';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

describe('WhiskerMenu keyboard shortcuts', () => {
  let dispatchSpy: jest.SpyInstance<boolean, [event: Event]>;

  const openMenuAndSearch = async (term: string) => {
    render(<WhiskerMenu />);
    fireEvent.click(screen.getByRole('button', { name: /applications/i }));
    const input = await screen.findByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: term } });
    return input;
  };

  beforeEach(() => {
    localStorage.clear();
    dispatchSpy = jest.spyOn(window, 'dispatchEvent');
  });

  afterEach(() => {
    dispatchSpy.mockRestore();
  });

  it('dispatches an open-app event when Enter is pressed', async () => {
    await openMenuAndSearch('Calculator');
    await screen.findByText('Calculator');
    dispatchSpy.mockClear();

    fireEvent.keyDown(window, { key: 'Enter' });

    const events = dispatchSpy.mock.calls.filter(([evt]) => evt.type === 'open-app');
    expect(events).toHaveLength(1);
    const event = events[0][0] as CustomEvent<{ id: string; spawnNew: boolean }>;
    expect(event.detail).toEqual({ id: 'calculator', spawnNew: false });
  });

  it('dispatches an open-app event requesting a new window on Alt+Enter', async () => {
    await openMenuAndSearch('Terminal');
    await screen.findByText('Terminal');
    dispatchSpy.mockClear();

    fireEvent.keyDown(window, { key: 'Enter', altKey: true });

    const events = dispatchSpy.mock.calls.filter(([evt]) => evt.type === 'open-app');
    expect(events).toHaveLength(1);
    const event = events[0][0] as CustomEvent<{ id: string; spawnNew: boolean }>;
    expect(event.detail).toEqual({ id: 'terminal', spawnNew: true });
  });

  it('announces keyboard shortcuts in the aria-label', async () => {
    await openMenuAndSearch('Calculator');
    const appButton = await screen.findByRole('button', {
      name: /calculator.*press enter to open/i,
    });
    const aria = appButton.getAttribute('aria-label') || '';
    expect(aria).toContain('Press Enter to open');
    expect(aria).toMatch(/Alt\+Enter/i);
  });
});
