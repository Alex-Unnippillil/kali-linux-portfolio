import { act, render, waitFor } from '@testing-library/react';
import React from 'react';
import ShareTarget from '../pages/share-target';
import { useRouter } from 'next/router';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

const mockedUseRouter = useRouter as jest.Mock;

describe('ShareTarget routing', () => {
  beforeEach(() => {
    mockedUseRouter.mockReturnValue({
      isReady: true,
      query: {},
      replace: jest.fn().mockResolvedValue(undefined),
    });
    window.sessionStorage.clear();
  });

  afterEach(() => {
    delete (window as any).launchQueue;
    jest.clearAllMocks();
  });

  it('stores shared files and routes to the Evidence Vault', async () => {
    let consumer: ((params: any) => void) | undefined;
    (window as any).launchQueue = {
      setConsumer: (cb: (params: any) => void) => {
        consumer = cb;
      },
    };

    const { container } = render(<ShareTarget />);
    expect(container.textContent).toContain('Processing shared content');

    const replace = mockedUseRouter.mock.results[0].value.replace as jest.Mock;

    await act(async () => {
      await consumer?.({
        files: [
          {
            getFile: async () => new File(['hello'], 'hello.txt', { type: 'text/plain' }),
          },
        ],
      });
    });

    await waitFor(() => {
      expect(replace).toHaveBeenCalled();
    });

    const calledUrl = replace.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/apps/evidence-vault?');
    const params = new URLSearchParams(calledUrl.split('?')[1]);
    const shareKey = params.get('shareKey');
    expect(shareKey).toBeTruthy();
    const payloadRaw = shareKey ? window.sessionStorage.getItem(shareKey) : null;
    expect(payloadRaw).toBeTruthy();
    const payload = payloadRaw ? JSON.parse(payloadRaw) : {};
    expect(payload.files).toHaveLength(1);
    expect(payload.files[0].name).toBe('hello.txt');
  });

  it('falls back to Sticky Notes for text-only shares', async () => {
    mockedUseRouter.mockReturnValue({
      isReady: true,
      query: { text: 'shared note' },
      replace: jest.fn().mockResolvedValue(undefined),
    });

    render(<ShareTarget />);
    await act(async () => {
      await Promise.resolve();
    });

    const replace = mockedUseRouter.mock.results[0].value.replace as jest.Mock;
    expect(replace).toHaveBeenCalledWith(
      expect.stringContaining('/apps/sticky_notes?text=')
    );
  });

  it('routes to Input Hub when file reading fails', async () => {
    let consumer: ((params: any) => void) | undefined;
    (window as any).launchQueue = {
      setConsumer: (cb: (params: any) => void) => {
        consumer = cb;
      },
    };

    const replace = jest.fn().mockResolvedValue(undefined);
    mockedUseRouter.mockReturnValue({
      isReady: true,
      query: {},
      replace,
    });

    render(<ShareTarget />);

    await act(async () => {
      await consumer?.({
        files: [
          {
            getFile: async () => {
              throw new Error('boom');
            },
          },
        ],
      });
    });

    await waitFor(() => {
      expect(replace).toHaveBeenCalled();
    });

    expect(replace).toHaveBeenCalledWith(
      expect.stringContaining('/input-hub?shareError=file-read')
    );
  });
});
