import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import GitHubStars from '../components/GitHubStars';

const originalFetch = global.fetch;

describe('GitHubStars', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    class IntersectionObserverMock implements IntersectionObserver {
      readonly root: Element | Document | null = null;
      readonly rootMargin: string = '0px';
      readonly thresholds: ReadonlyArray<number> = [];
      private callback: IntersectionObserverCallback;

      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
      }

      observe(target: Element) {
        this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this);
      }

      unobserve() {}

      disconnect() {}

      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }

    (global as any).IntersectionObserver = IntersectionObserverMock;
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
    fetchMock.mockReset();
    (global as any).fetch = originalFetch;
    delete (global as any).IntersectionObserver;
  });

  it('backs off when the GitHub API returns 403 and shows a banner', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: jest.fn(),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ stargazers_count: 42 }),
      });

    render(<GitHubStars user="alex" repo="portfolio" />);

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent(/rate limited/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await screen.findByText('⭐ 42');
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});
