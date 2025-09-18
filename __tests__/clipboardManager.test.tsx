import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('../utils/safeIDB', () => ({
  getDb: jest.fn(),
}));

import ClipboardManager from '../components/apps/ClipboardManager';
import { getDb } from '../utils/safeIDB';

const createPermissionStatus = (state: PermissionState) =>
  ({
    state,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }) as unknown as PermissionStatus;

describe('ClipboardManager privacy mode', () => {
  beforeEach(() => {
    (getDb as jest.Mock).mockReset();
    localStorage.clear();
    jest.clearAllMocks();
  });

  const setup = async (permissionState: PermissionState = 'granted') => {
    const add = jest.fn().mockResolvedValue(undefined);
    const transaction = jest.fn(() => ({
      store: { add },
      done: Promise.resolve(),
    }));
    const clear = jest.fn().mockResolvedValue(undefined);
    const getAll = jest.fn().mockResolvedValue([]);
    const mockDb = {
      transaction,
      clear,
      getAll,
    } as const;

    (getDb as jest.Mock).mockResolvedValue(mockDb);

    const readText = jest.fn().mockResolvedValue('secret note');
    const writeText = jest.fn();
    const query = jest
      .fn()
      .mockResolvedValue(createPermissionStatus(permissionState));

    const mockNavigator = {
      clipboard: { readText, writeText },
      permissions: { query },
    } as unknown as Navigator;

    const user = userEvent.setup();
    render(<ClipboardManager nav={mockNavigator} />);

    await waitFor(() => expect(query).toHaveBeenCalled());

    return {
      transaction,
      readText,
      query,
      user,
    };
  };

  test('skips IndexedDB persistence when privacy mode is enabled', async () => {
    const { query, user, readText, transaction } = await setup();

    const toggle = screen.getByRole('checkbox', { name: /privacy mode/i });
    await user.click(toggle);
    expect(toggle).toBeChecked();

    act(() => {
      document.dispatchEvent(new Event('copy', { bubbles: true }));
    });

    await waitFor(() => expect(query).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(readText).toHaveBeenCalledTimes(1));
    expect(transaction).not.toHaveBeenCalled();

    expect(await screen.findByText('secret note')).toBeInTheDocument();
  });

  test('shows CTA when clipboard read permission is denied', async () => {
    const { query, readText } = await setup('denied');

    expect(
      await screen.findByText(/clipboard access is blocked/i),
    ).toBeInTheDocument();

    act(() => {
      document.dispatchEvent(new Event('copy', { bubbles: true }));
    });

    await waitFor(() => expect(query).toHaveBeenCalledTimes(2));
    expect(readText).not.toHaveBeenCalled();
  });
});

