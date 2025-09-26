import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShortcutOverlay from '../components/common/ShortcutOverlay';

let root: HTMLDivElement;
const originalRaf = window.requestAnimationFrame;
const originalCancelRaf = window.cancelAnimationFrame;

beforeAll(() => {
  Object.defineProperty(window, 'requestAnimationFrame', {
    writable: true,
    value: (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(Date.now()), 0),
  });
  Object.defineProperty(window, 'cancelAnimationFrame', {
    writable: true,
    value: (id: number) => window.clearTimeout(id),
  });
});

afterAll(() => {
  Object.defineProperty(window, 'requestAnimationFrame', {
    writable: true,
    value: originalRaf,
  });
  Object.defineProperty(window, 'cancelAnimationFrame', {
    writable: true,
    value: originalCancelRaf,
  });
});

describe('ShortcutOverlay', () => {
  beforeEach(() => {
    window.localStorage.removeItem('keymap');
    root = document.createElement('div');
    root.setAttribute('id', '__next');
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.removeChild(root);
  });

  it('opens via shortcut, filters, and highlights conflicts', async () => {
    window.localStorage.setItem(
      'keymap',
      JSON.stringify({
        'Show keyboard shortcuts': 'a',
        'Open settings': 'a',
      })
    );

    render(<ShortcutOverlay />, { container: root });
    fireEvent.keyDown(window, { key: 'a' });

    await screen.findByRole('dialog', { name: /keyboard shortcuts/i });

    const conflictLabels = await screen.findAllByText(
      /In conflict with another shortcut/i
    );
    expect(conflictLabels.length).toBeGreaterThanOrEqual(2);

    const search = screen.getByLabelText(/filter shortcuts/i);
    fireEvent.change(search, { target: { value: 'workspace' } });

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('4 shortcuts shown')
    );

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
    options.forEach((option) => {
      expect(option.textContent).toContain('workspace');
    });
  });

  it('supports keyboard navigation', async () => {
    render(<ShortcutOverlay />, { container: root });

    fireEvent.keyDown(window, { key: '?', shiftKey: true });

    const search = await screen.findByLabelText(/filter shortcuts/i);
    await waitFor(() => expect(search).toHaveFocus());

    fireEvent.keyDown(search, { key: 'ArrowDown' });
    const options = screen.getAllByRole('option');
    await waitFor(() => expect(document.activeElement).toBe(options[0]));

    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowDown' });
    await waitFor(() => expect(document.activeElement).toBe(options[1]));

    fireEvent.keyDown(document.activeElement as Element, { key: 'End' });
    await waitFor(() =>
      expect(document.activeElement).toBe(options[options.length - 1])
    );

    fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /keyboard shortcuts/i }))
        .not.toBeInTheDocument()
    );
  });
});
