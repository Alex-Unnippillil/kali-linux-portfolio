import 'fake-indexeddb/auto';

// Provide a lightweight structuredClone polyfill for fake-indexeddb
// in environments where it is missing.
// @ts-ignore
if (typeof globalThis.structuredClone !== 'function') {
  // @ts-ignore
  globalThis.structuredClone = (val: any) => JSON.parse(JSON.stringify(val));
}

import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import ClipboardManager from '../components/apps/ClipboardManager';

declare global {
  interface Navigator {
    permissions?: {
      query: (params: { name: string }) => Promise<{ state: PermissionState }>;
    };
  }
}

beforeEach(() => {
  (navigator as any).clipboard = {
    readText: jest.fn(),
    writeText: jest.fn(),
  };
  (navigator as any).permissions = {
    query: jest.fn().mockResolvedValue({ state: 'granted' }),
  };
});

afterEach(() => {
  jest.clearAllMocks();
});

async function triggerCopy() {
  await act(async () => {
    document.dispatchEvent(new Event('copy'));
  });
  await waitFor(() =>
    expect((navigator as any).clipboard.readText).toHaveBeenCalled()
  );
}

function getEntryByText(text: string) {
  const entries = screen.getAllByTestId('clipboard-entry');
  return entries.find((entry) => within(entry).queryByText(text));
}

test('pinned entries survive reload', async () => {
  const readTextMock = (navigator as any).clipboard
    .readText as jest.MockedFunction<() => Promise<string>>;
  readTextMock.mockResolvedValue('first item');

  const { unmount } = render(<ClipboardManager />);
  await triggerCopy();
  expect(await screen.findByText('first item')).toBeInTheDocument();

  const pinButton = await screen.findByRole('button', { name: /pin entry/i });
  fireEvent.click(pinButton);
  await screen.findByTestId('pinned-list');

  unmount();

  render(<ClipboardManager />);
  await screen.findByText('first item');
  await screen.findByTestId('pinned-list');
  expect(await screen.findByRole('button', { name: /unpin entry/i })).toBeInTheDocument();
});

test('exports selected entries as JSON', async () => {
  const readTextMock = (navigator as any).clipboard
    .readText as jest.MockedFunction<() => Promise<string>>;
  readTextMock
    .mockResolvedValueOnce('first entry')
    .mockResolvedValueOnce('second entry');

  render(<ClipboardManager />);
  await triggerCopy();
  expect(await screen.findByText('first entry')).toBeInTheDocument();
  await triggerCopy();
  expect(await screen.findByText('second entry')).toBeInTheDocument();

  const firstEntry = getEntryByText('first entry');
  expect(firstEntry).toBeTruthy();
  const firstLabelInput = within(firstEntry!)
    .getByLabelText('entry label') as HTMLInputElement;
  fireEvent.change(firstLabelInput, { target: { value: 'First label' } });
  fireEvent.blur(firstLabelInput);
  await waitFor(() =>
    expect(
      (within(getEntryByText('first entry')!)
        .getByLabelText('entry label') as HTMLInputElement
      ).value
    ).toBe('First label')
  );

  const secondEntry = getEntryByText('second entry');
  expect(secondEntry).toBeTruthy();
  const pinButton = within(secondEntry!).getByRole('button', { name: /pin entry/i });
  fireEvent.click(pinButton);
  await waitFor(() =>
    expect(
      within(getEntryByText('second entry')!)
        .getByRole('button', { name: /unpin entry/i })
    ).toBeInTheDocument()
  );

  const firstCheckbox = within(getEntryByText('first entry')!)
    .getByRole('checkbox');
  const secondCheckbox = within(getEntryByText('second entry')!)
    .getByRole('checkbox');
  fireEvent.click(firstCheckbox);
  fireEvent.click(secondCheckbox);

  const exportButton = screen.getByRole('button', { name: /export selected/i });
  expect(exportButton).not.toBeDisabled();

  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  const originalBlob = Blob;
  const createObjectURLSpy = jest.fn(() => 'blob:url');
  const revokeObjectURLSpy = jest.fn();
  (URL as any).createObjectURL = createObjectURLSpy;
  (URL as any).revokeObjectURL = revokeObjectURLSpy;
  const clickSpy = jest
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {});
  (global as any).Blob = class BlobMock {
    private data: string;
    public type: string;
    constructor(parts: any[] = [], options?: { type?: string }) {
      this.data = parts
        .map((part) =>
          typeof part === 'string' ? part : JSON.stringify(part)
        )
        .join('');
      this.type = options?.type ?? '';
    }
    text() {
      return Promise.resolve(this.data);
    }
    arrayBuffer() {
      const buffer = Buffer.from(this.data, 'utf-8');
      return Promise.resolve(
        buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength
        )
      );
    }
  } as any;

  try {
    fireEvent.click(exportButton);

    await waitFor(() => expect(createObjectURLSpy).toHaveBeenCalledTimes(1));
    expect(clickSpy).toHaveBeenCalled();
    const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
    const exportedText = await (async () => {
      if (typeof (blob as any).text === 'function') {
        return (blob as any).text();
      }
      if (typeof (blob as any).arrayBuffer === 'function') {
        const buffer = await (blob as any).arrayBuffer();
        return Buffer.from(buffer).toString('utf-8');
      }
      throw new Error('Unable to read blob contents');
    })();
    const data = JSON.parse(exportedText);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: 'first entry',
          label: 'First label',
          pinned: false,
        }),
        expect.objectContaining({
          text: 'second entry',
          pinned: true,
        }),
      ])
    );
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:url');
  } finally {
    clickSpy.mockRestore();
    (URL as any).createObjectURL = originalCreate;
    (URL as any).revokeObjectURL = originalRevoke;
    (global as any).Blob = originalBlob;
  }
});
