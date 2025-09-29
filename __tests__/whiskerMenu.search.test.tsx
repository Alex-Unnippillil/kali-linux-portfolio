import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import WhiskerMenu from '../components/menu/WhiskerMenu';

const OriginalWorker = (global as any).Worker;

const globalScope = globalThis as { requestAnimationFrame?: typeof requestAnimationFrame };

if (typeof globalScope.requestAnimationFrame !== 'function') {
  globalScope.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0);
}

describe('WhiskerMenu worker-powered search', () => {
  afterEach(() => {
    (global as any).Worker = OriginalWorker;
  });

  it('filters applications via the search worker and reports metrics', async () => {
    class WorkerMock {
      public onmessage: ((event: MessageEvent) => void) | null = null;

      public onerror: ((event: ErrorEvent) => void) | null = null;

      private apps = new Map<string, any>();

      constructor() {
        // no-op
      }

      postMessage = jest.fn((message: any) => {
        if (message.type === 'initialize') {
          this.apps = new Map(message.payload.apps.map((app: any) => [app.id, app]));
          setTimeout(() => {
            this.onmessage?.({ data: { type: 'ready' } } as MessageEvent);
          }, 0);
        }
        if (message.type === 'search') {
          const { query, appIds, requestId } = message.payload;
          setTimeout(() => {
            const normalized = String(query).toLowerCase();
            const apps = (appIds ?? Array.from(this.apps.keys()))
              .map((id: string) => this.apps.get(id))
              .filter((app: any) => app && app.title.toLowerCase().includes(normalized));
            this.onmessage?.({
              data: {
                type: 'result',
                payload: {
                  requestId,
                  duration: 0.8,
                  apps,
                },
              },
            } as MessageEvent);
          }, 20);
        }
      });

      terminate = jest.fn();
    }

    (global as any).Worker = WorkerMock as any;

    render(<WhiskerMenu />);

    fireEvent.click(screen.getByRole('button', { name: /applications/i }));
    const input = await screen.findByPlaceholderText(/search applications/i);
    const resultsContainer = await screen.findByTestId('search-results');
    fireEvent.change(input, { target: { value: 'calc' } });

    expect(await screen.findByText(/Searching/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/Searching/i)).not.toBeInTheDocument();
    });

    expect(screen.queryByText(/No applications match/i)).not.toBeInTheDocument();
    await waitFor(() => {
      expect(Number(resultsContainer.getAttribute('data-search-duration'))).toBeGreaterThan(0);
    });
  });

  it('falls back gracefully when the worker errors', async () => {
    class ErrorWorkerMock {
      public onmessage: ((event: MessageEvent) => void) | null = null;

      public onerror: ((event: ErrorEvent) => void) | null = null;

      postMessage = jest.fn((message: any) => {
        if (message.type === 'search') {
          setTimeout(() => {
            this.onerror?.({ message: 'boom' } as ErrorEvent);
          }, 0);
        }
      });

      terminate = jest.fn();
    }

    (global as any).Worker = ErrorWorkerMock as any;

    render(<WhiskerMenu />);

    fireEvent.click(screen.getByRole('button', { name: /applications/i }));
    const input = await screen.findByPlaceholderText(/search applications/i);
    fireEvent.change(input, { target: { value: 'calc' } });

    const calculatorButtons = await screen.findAllByRole('button', { name: /Calculator/i });
    expect(calculatorButtons.length).toBeGreaterThan(0);

    expect(screen.getByText(/Search worker error/i)).toBeInTheDocument();
  });

  it('terminates the worker when the menu closes', async () => {
    const terminateSpy = jest.fn();
    const createdWorkers: any[] = [];

    class LifecycleWorkerMock {
      public onmessage: ((event: MessageEvent) => void) | null = null;

      public onerror: ((event: ErrorEvent) => void) | null = null;

      public postMessage = jest.fn((message: any) => {
        if (message.type === 'initialize') {
          setTimeout(() => {
            this.onmessage?.({ data: { type: 'ready' } } as MessageEvent);
          }, 0);
        }
      });

      public terminate = terminateSpy;

      constructor() {
        createdWorkers.push(this);
      }
    }

    (global as any).Worker = LifecycleWorkerMock as any;

    render(<WhiskerMenu />);

    fireEvent.click(screen.getByRole('button', { name: /applications/i }));
    const input = await screen.findByPlaceholderText(/search applications/i);
    fireEvent.change(input, { target: { value: 'calc' } });

    await waitFor(() => {
      expect(createdWorkers.length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      expect(createdWorkers[0].postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'search' }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /applications/i }));

    await waitFor(() => {
      expect(terminateSpy).toHaveBeenCalled();
    }, { timeout: 500 });
  });
});
