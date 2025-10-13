import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClipboardManager from '../components/apps/ClipboardManager';
import { getDb } from '../utils/safeIDB';

jest.mock('../utils/safeIDB', () => ({
  getDb: jest.fn(),
}));

type MockDb = ReturnType<typeof createMockDb>;

const createMockDb = () => {
  const store: { items: Array<{ id: number; text: string; created: number }> } = {
    items: [],
  };

  const getAll = jest.fn(async () => [...store.items]);
  const transaction = jest.fn(() => {
    const add = jest.fn(async (item: { text: string; created: number }) => {
      const nextId = (store.items[store.items.length - 1]?.id ?? 0) + 1;
      const record = { ...item, id: nextId };
      store.items.push(record);
      return record.id;
    });
    return {
      store: {
        add,
      },
      done: Promise.resolve(),
    };
  });
  const clear = jest.fn(async () => {
    store.items = [];
  });

  return { getAll, transaction, clear };
};

const mockClipboard = (overrides: Partial<Clipboard> = {}) => {
  const clipboardMock = {
    readText: jest.fn(),
    writeText: jest.fn(),
    ...overrides,
  } as Clipboard;

  Object.defineProperty(navigator, 'clipboard', {
    value: clipboardMock,
    configurable: true,
  });

  return clipboardMock;
};

const mockPermissions = () => {
  const query = jest.fn();
  Object.defineProperty(navigator, 'permissions', {
    value: { query },
    configurable: true,
  });
  return query;
};

describe('ClipboardManager', () => {
  let db: MockDb;
  const originalClipboard = navigator.clipboard;
  const originalPermissions = (navigator as any).permissions;

  beforeEach(() => {
    db = createMockDb();
    (getDb as jest.Mock).mockReturnValue(Promise.resolve(db));
  });

  afterEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
    });
    Object.defineProperty(navigator, 'permissions', {
      value: originalPermissions,
      configurable: true,
    });
  });

  it('shows unsupported guidance when clipboard API is missing', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(navigator, 'permissions', {
      value: undefined,
      configurable: true,
    });

    render(<ClipboardManager />);

    expect(await screen.findByText(/Clipboard API not supported/i)).toBeInTheDocument();
    expect(screen.getByTestId('clipboard-read-status').textContent).toBe('Not supported');
    expect(screen.getByTestId('clipboard-write-status').textContent).toBe('Not supported');
  });

  it('surfaces denied permissions with retry guidance', async () => {
    mockClipboard();
    const query = mockPermissions();
    query
      .mockResolvedValueOnce({ state: 'denied' })
      .mockResolvedValueOnce({ state: 'prompt' })
      .mockResolvedValueOnce({ state: 'prompt' })
      .mockResolvedValueOnce({ state: 'prompt' });

    render(<ClipboardManager />);

    expect(await screen.findByText(/Clipboard access blocked/i)).toBeInTheDocument();
    expect(
      await screen.findByText(/Clipboard read access is blocked\. Allow clipboard permissions in your browser settings/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry permission check/i })).toBeInTheDocument();
    await waitFor(() => expect(query).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole('button', { name: /Retry permission check/i }));

    await waitFor(() => expect(query.mock.calls.length).toBeGreaterThanOrEqual(4));
  });

  it('records clipboard items and supports writing them back when permissions are granted', async () => {
    const clipboard = mockClipboard();
    const query = mockPermissions();
    query.mockResolvedValue({ state: 'granted' });
    clipboard.readText = jest.fn().mockResolvedValue('Hello world');
    clipboard.writeText = jest.fn().mockResolvedValue(undefined);

    render(<ClipboardManager />);

    await waitFor(() => expect(query).toHaveBeenCalledTimes(2));

    const copyEvent = new Event('copy');
    document.dispatchEvent(copyEvent);

    expect(await screen.findByText('Hello world')).toBeInTheDocument();
    expect(await screen.findByText(/Latest clipboard item saved./i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Hello world'));

    await waitFor(() => expect(clipboard.writeText).toHaveBeenCalledWith('Hello world'));
    expect(await screen.findByText(/Copied to clipboard./i)).toBeInTheDocument();
  });
});
