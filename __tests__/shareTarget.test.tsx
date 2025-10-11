import { act, render, waitFor } from '@testing-library/react';
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
    currentRouter = { isReady: true, query: {}, replace: replaceMock };
    useRouterMock.mockImplementation(() => currentRouter);
  });

  afterEach(() => {
    delete (window as any).launchQueue;
    jest.clearAllMocks();
  });

  it('passes shared file metadata through to the input hub message', async () => {
    let consumer: ((params: any) => Promise<void> | void) | undefined;
    (window as any).launchQueue = {
      setConsumer: jest.fn((cb: typeof consumer) => {
        consumer = cb;
      }),
    };

    currentRouter.query = {
      text: 'Shared message',
    };

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
});
