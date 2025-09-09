import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import Clipman, { CLIPMAN_STORAGE_KEY } from '../src/plugins/Clipman';

let original: string | null;

beforeEach(() => {
  original = window.localStorage.getItem(CLIPMAN_STORAGE_KEY);
  window.localStorage.removeItem(CLIPMAN_STORAGE_KEY);
});

afterEach(() => {
  if (original === null) {
    window.localStorage.removeItem(CLIPMAN_STORAGE_KEY);
  } else {
    window.localStorage.setItem(CLIPMAN_STORAGE_KEY, original);
  }
  cleanup();
});

test('triggers URL handler', () => {
  const urlHandler = jest.fn();
  render(<Clipman onUrl={urlHandler} />);
  const input = screen.getByLabelText('clipboard input');
  fireEvent.change(input, { target: { value: 'https://example.com' } });
  fireEvent.click(screen.getByText('Add'));
  expect(urlHandler).toHaveBeenCalledWith('https://example.com');
});

test('triggers email handler', () => {
  const emailHandler = jest.fn();
  render(<Clipman onEmail={emailHandler} />);
  const input = screen.getByLabelText('clipboard input');
  fireEvent.change(input, { target: { value: 'user@example.com' } });
  fireEvent.click(screen.getByText('Add'));
  expect(emailHandler).toHaveBeenCalledWith('user@example.com');
});

test('triggers hex handler', () => {
  const hexHandler = jest.fn();
  render(<Clipman onHex={hexHandler} />);
  const input = screen.getByLabelText('clipboard input');
  fireEvent.change(input, { target: { value: '0xdeadbeef' } });
  fireEvent.click(screen.getByText('Add'));
  expect(hexHandler).toHaveBeenCalledWith('0xdeadbeef');
});

test('updates settings and persists them', async () => {
  render(<Clipman />);
  const sync = screen.getByLabelText('Sync selections');
  const persist = screen.getByLabelText('Persist on exit');
  fireEvent.click(sync);
  fireEvent.click(persist);
  await waitFor(() => {
    const raw = window.localStorage.getItem(CLIPMAN_STORAGE_KEY) || '{}';
    const data = JSON.parse(raw);
    expect(data.settings.syncSelections).toBe(true);
    expect(data.settings.persistOnExit).toBe(true);
  });
});

test('persists history on exit when enabled', async () => {
  const { unmount } = render(<Clipman />);
  const persist = screen.getByLabelText('Persist on exit');
  fireEvent.click(persist);
  const input = screen.getByLabelText('clipboard input');
  fireEvent.change(input, { target: { value: 'hello' } });
  fireEvent.click(screen.getByText('Add'));
  unmount();
  await waitFor(() => {
    const raw = window.localStorage.getItem(CLIPMAN_STORAGE_KEY) || '{}';
    const data = JSON.parse(raw);
    expect(data.history[0]).toBe('hello');
  });
});
