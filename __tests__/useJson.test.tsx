import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import useJson from '../hooks/useJson';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe('useJson', () => {
  it('caches requests with SWR', async () => {
    const fetchMock = jest.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ ok: true }) })
    );
    // @ts-ignore
    global.fetch = fetchMock;

    const cache = new Map();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SWRConfig value={{ provider: () => cache }}>{children}</SWRConfig>
    );

    const { result: first } = renderHook(() => useJson('/api/test'), { wrapper });
    await waitFor(() => expect(first.current.data).toEqual({ ok: true }));

    const { result: second } = renderHook(() => useJson('/api/test'), { wrapper });
    await waitFor(() => expect(second.current.data).toEqual({ ok: true }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
