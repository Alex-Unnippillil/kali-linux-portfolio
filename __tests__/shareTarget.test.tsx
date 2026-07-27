import { render, waitFor } from '@testing-library/react';
import ShareTarget from '../pages/share-target';
import { useRouter } from 'next/router';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

const useRouterMock = useRouter as unknown as jest.Mock;

function createRouterMock(overrides: Record<string, unknown> = {}) {
  return {
    isReady: true,
    query: {},
    replace: jest.fn(),
    ...overrides,
  };
}

describe('Share target redirect for sticky notes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to sticky notes with sanitized share parameters', async () => {
    const replaceMock = jest.fn();
    const router = createRouterMock({
      query: {
        title: '  Incident Note  ',
        text: ' Investigation details ',
        url: ' https://example.com/findings ',
      },
      replace: replaceMock,
    });
    useRouterMock.mockReturnValue(router);

    render(<ShareTarget />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalled();
    });

    const target = replaceMock.mock.calls[0][0] as string;
    expect(target.startsWith('/apps/sticky_notes')).toBe(true);

    const query = target.split('?')[1];
    expect(query).toBeDefined();
    const params = new URLSearchParams(query);
    expect(params.get('title')).toBe('Incident Note');
    expect(params.get('text')).toBe('Investigation details');
    expect(params.get('url')).toBe('https://example.com/findings');
  });

  it('omits empty parameters and falls back to base sticky notes route', async () => {
    const replaceMock = jest.fn();
    const router = createRouterMock({
      query: {
        title: '   ',
        text: '',
      },
      replace: replaceMock,
    });
    useRouterMock.mockReturnValue(router);

    render(<ShareTarget />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/apps/sticky_notes');
    });
  });
});
