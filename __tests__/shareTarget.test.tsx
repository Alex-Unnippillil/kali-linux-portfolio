import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ShareTarget from '../pages/share-target';
import InputHub from '../pages/input-hub';
import { useRouter } from 'next/router';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

const useRouterMock = useRouter as unknown as jest.Mock;

describe('Share target workflow', () => {
  let currentRouter: any;
  let replaceMock: jest.Mock;

  beforeEach(() => {
    replaceMock = jest.fn();
    currentRouter = { isReady: true, query: {}, asPath: '/share-target', replace: replaceMock };
    useRouterMock.mockImplementation(() => currentRouter);
    window.sessionStorage.clear();
  });

  afterEach(() => {
    delete (window as any).launchQueue;
    delete (navigator as any).clipboard;
    jest.clearAllMocks();
  });

  it('routes to Input Hub with shared metadata when the action is selected', async () => {
    let consumer: ((params: any) => Promise<void> | void) | undefined;
    (window as any).launchQueue = {
      setConsumer: jest.fn((cb: typeof consumer) => {
        consumer = cb;
      }),
    };

    currentRouter.query = {
      text: 'Shared message',
    };
    currentRouter.asPath = '/share-target?text=Shared%20message';

    const { unmount } = render(<ShareTarget />);

    expect((window as any).launchQueue.setConsumer).toHaveBeenCalled();
    expect(consumer).toBeDefined();

    const sharedFiles = [
      { name: 'evidence.txt', type: 'text/plain' },
      { name: 'report.pdf', type: 'application/pdf' },
    ];
    const launchParams = {
      files: sharedFiles.map((file) => ({
        getFile: jest.fn().mockResolvedValue(
          new File(['test'], file.name, { type: file.type })
        ),
      })),
    };

    await act(async () => {
      await consumer?.(launchParams);
    });

    const inputHubButton = await screen.findByRole('button', {
      name: /send to input hub/i,
    });

    fireEvent.click(inputHubButton);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalled();
    });

    const target = replaceMock.mock.calls[0][0] as string;
    expect(target.startsWith('/input-hub?')).toBe(true);
    const query = target.split('?')[1];
    const params = new URLSearchParams(query);
    const filesParam = params.get('files');
    expect(filesParam).toBeTruthy();

    const parsed = JSON.parse(filesParam as string);
    expect(parsed).toEqual(sharedFiles);

    unmount();

    currentRouter = {
      query: Object.fromEntries(params.entries()),
    };

    const { container } = render(<InputHub />);

    const messageField = container.querySelector('textarea[placeholder="Message"]') as HTMLTextAreaElement;
    expect(messageField).toBeTruthy();

    await waitFor(() => {
      expect(messageField.value).toContain('File: evidence.txt (text/plain)');
      expect(messageField.value).toContain('File: report.pdf (application/pdf)');
    });
  });

  it('stores shared text for Sticky Notes and updates session storage cache', async () => {
    currentRouter.query = { text: 'Note content' };
    currentRouter.asPath = '/share-target?text=Note%20content';
    render(<ShareTarget />);

    const notesButton = await screen.findByRole('button', { name: /send to sticky notes/i });

    fireEvent.click(notesButton);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(expect.stringMatching(/^\/apps\/sticky_notes\?/));
    });

    const cache = window.sessionStorage.getItem('sticky-notes-share-cache');
    expect(cache).toBeTruthy();
    const parsed = cache ? JSON.parse(cache) : null;
    expect(parsed?.text).toBe('Note content');
  });

  it('queues shared text for the clipboard manager and attempts to copy', async () => {
    currentRouter.query = { text: 'Clipboard item' };
    currentRouter.asPath = '/share-target?text=Clipboard%20item';
    const writeText = jest.fn().mockResolvedValue(undefined);
    (navigator as any).clipboard = { writeText };

    render(<ShareTarget />);

    const clipboardButton = await screen.findByRole('button', {
      name: /copy to clipboard manager/i,
    });

    fireEvent.click(clipboardButton);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/apps/clipboard-manager');
    });

    expect(writeText).toHaveBeenCalledWith('Clipboard item');
    const queue = window.sessionStorage.getItem('clipboard-share-queue');
    expect(queue).toBeTruthy();
    const parsedQueue = queue ? JSON.parse(queue) : null;
    expect(Array.isArray(parsedQueue)).toBe(true);
    expect(parsedQueue?.[0]?.text).toBe('Clipboard item');
  });
});
