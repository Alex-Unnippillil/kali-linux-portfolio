import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ClipboardManager, {
  CLIPBOARD_DB_NAME,
  CLIPBOARD_STORE_NAME,
  CLIPBOARD_RETENTION_MS,
  MAX_CLIPBOARD_ITEMS,
  closeClipboardDb,
  getClipboardDb,
  resetClipboardDbCache,
} from '../../../components/apps/ClipboardManager';

describe('ClipboardManager', () => {
  const originalClipboard = navigator.clipboard;
  const originalPermissions = (navigator as any).permissions;

  const resetDatabase = async () => {
    await closeClipboardDb();
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(CLIPBOARD_DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
    resetClipboardDbCache();
  };

  beforeEach(async () => {
    await resetDatabase();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        readText: jest.fn().mockResolvedValue(''),
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: {
        query: jest.fn().mockResolvedValue({ state: 'granted' }),
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: originalClipboard,
      });
    } else {
      delete (navigator as any).clipboard;
    }
    if (originalPermissions) {
      Object.defineProperty(navigator, 'permissions', {
        configurable: true,
        value: originalPermissions,
      });
    } else {
      delete (navigator as any).permissions;
    }
  });

  it('enforces retention limits and keeps pinned items', async () => {
    const db = await getClipboardDb();
    expect(db).toBeTruthy();
    if (!db) throw new Error('Failed to open clipboard DB');

    const tx = db.transaction(CLIPBOARD_STORE_NAME, 'readwrite');
    const now = Date.now();
    for (let i = 0; i < MAX_CLIPBOARD_ITEMS + 5; i += 1) {
      await tx.store.add({
        text: `item-${i}`,
        created: now - i * 1000,
        pinned: false,
      });
    }
    await tx.store.add({
      text: 'pinned-old',
      created: now - CLIPBOARD_RETENTION_MS - 5000,
      pinned: true,
    });
    await tx.store.add({
      text: 'expired',
      created: now - CLIPBOARD_RETENTION_MS - 5000,
      pinned: false,
    });
    await tx.done;

    render(<ClipboardManager />);

    await screen.findByText('pinned-old');

    const pinnedSection = await screen.findByLabelText('Pinned clipboard entries');
    expect(within(pinnedSection).getByText('pinned-old')).toBeInTheDocument();

    const recentSection = await screen.findByLabelText('Recent clipboard entries');
    await waitFor(() => {
      expect(within(recentSection).getAllByRole('listitem')).toHaveLength(MAX_CLIPBOARD_ITEMS);
    });
    expect(screen.queryByText('expired')).not.toBeInTheDocument();
    expect(screen.queryByText(`item-${MAX_CLIPBOARD_ITEMS + 4}`)).not.toBeInTheDocument();
  });

  it('allows pinning and unpinning entries', async () => {
    const db = await getClipboardDb();
    expect(db).toBeTruthy();
    if (!db) throw new Error('Failed to open clipboard DB');

    const tx = db.transaction(CLIPBOARD_STORE_NAME, 'readwrite');
    await tx.store.add({ text: 'pin me', created: Date.now(), pinned: false });
    await tx.done;

    render(<ClipboardManager />);

    await screen.findByText('pin me');

    const row = screen.getByText('pin me').closest('div[data-active]');
    expect(row).toBeTruthy();
    const pinButton = within(row as HTMLElement).getByRole('button', { name: 'Pin' });
    fireEvent.click(pinButton);

    const pinnedSection = await screen.findByLabelText('Pinned clipboard entries');
    expect(within(pinnedSection).getByText('pin me')).toBeInTheDocument();

    const pinnedRow = within(pinnedSection).getByText('pin me').closest('div[data-active]');
    expect(pinnedRow).toBeTruthy();
    const unpinButton = within(pinnedRow as HTMLElement).getByRole('button', { name: 'Unpin' });
    fireEvent.click(unpinButton);

    await waitFor(() => {
      expect(screen.queryByLabelText('Pinned clipboard entries')).not.toBeInTheDocument();
    });
  });

  it('filters sensitive clipboard entries and shows a warning badge', async () => {
    const clipboard = navigator.clipboard as unknown as {
      readText: jest.Mock;
      writeText: jest.Mock;
    };
    clipboard.readText.mockResolvedValueOnce('api_key=ABCDEFGHIJKLMNOP1234567890');

    render(<ClipboardManager />);

    await act(async () => {
      fireEvent.copy(document);
    });

    await waitFor(() =>
      expect(screen.getByText('Filtered potential secret: generic secret')).toBeInTheDocument(),
    );

    expect(screen.queryByText(/api_key=ABCDEFGHIJKLMNOP1234567890/)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Filtered potential secret');
  });
});
