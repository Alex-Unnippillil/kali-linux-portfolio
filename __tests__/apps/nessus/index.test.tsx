import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRouter, type NextRouter } from 'next/router';
import Nessus from '../../../apps/nessus/index';
import { severities, type Plugin } from '../../../apps/nessus/types';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('html-to-image', () => ({
  toPng: jest.fn().mockResolvedValue('data:image/png;base64,'),
}));

const useRouterMock = useRouter as jest.MockedFunction<typeof useRouter>;

const createRouter = (overrides: Partial<NextRouter> = {}): NextRouter => {
  const replace = jest.fn().mockResolvedValue(true);
  const push = jest.fn().mockResolvedValue(true);
  const prefetch = jest.fn().mockResolvedValue(undefined);
  const router: NextRouter = {
    pathname: '/apps/nessus',
    query: {},
    isReady: true,
    replace,
    push,
    prefetch,
    asPath: '/apps/nessus',
    route: '/apps/nessus',
    basePath: '',
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
    beforePopState: jest.fn(),
    back: jest.fn(),
    reload: jest.fn(),
    forward: jest.fn(),
    isFallback: false,
    isLocaleDomain: false,
    isPreview: false,
    locale: undefined,
    locales: undefined,
    defaultLocale: undefined,
    domainLocales: undefined,
  };
  return {
    ...router,
    ...overrides,
    replace: overrides.replace ?? replace,
    push: overrides.push ?? push,
    prefetch: overrides.prefetch ?? prefetch,
  };
};

const createPlugins = (count: number): Plugin[] =>
  Array.from({ length: count }, (_, index) => ({
    id: 1000 + index,
    name: `Plugin ${index + 1}`,
    severity: severities[index % severities.length],
    tags: index % 2 === 0 ? ['ssl'] : ['ssh'],
  }));

const mockFetch = (plugins: Plugin[]) => {
  const scans = { findings: plugins.slice(0, 5).map((plugin) => ({ plugin: plugin.id, severity: plugin.severity })) };
  return jest.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('plugins.json')) {
      return {
        json: async () => plugins,
      } as unknown as Response;
    }
    if (url.includes('scan')) {
      return {
        json: async () => scans,
      } as unknown as Response;
    }
    throw new Error(`Unhandled fetch for ${url}`);
  });
};

describe('Nessus app URL synchronisation', () => {
  afterEach(() => {
    useRouterMock.mockReset();
    jest.restoreAllMocks();
  });

  it('hydrates filters and pagination from the query string', async () => {
    const plugins = createPlugins(60);
    mockFetch(plugins);
    const router = createRouter({
      query: { sev: 'Critical,High', tags: 'ssl', page: '2' },
    });
    useRouterMock.mockReturnValue(router as unknown as ReturnType<typeof useRouter>);

    render(<Nessus />);

    const sslButton = await screen.findByRole('button', { name: 'ssl' });

    await waitFor(() => {
      const medium = screen.getByLabelText('Medium') as HTMLInputElement;
      const high = screen.getByLabelText('High') as HTMLInputElement;
      expect(high.checked).toBe(true);
      expect(medium.checked).toBe(false);
    });

    expect(sslButton.className).toContain('bg-blue-600');
    expect(router.replace).toHaveBeenCalled();

    const lastCall = router.replace.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    const [url,, options] = lastCall!;
    expect(url).toContain('sev=Critical%2CHigh');
    expect(url).toContain('tags=ssl');
    expect(url).toContain('page=2');
    expect(options).toEqual({ shallow: true });
  });

  it('updates the query string when filters change', async () => {
    const plugins = createPlugins(60);
    mockFetch(plugins);
    const router = createRouter();
    useRouterMock.mockReturnValue(router as unknown as ReturnType<typeof useRouter>);

    render(<Nessus />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    router.replace.mockClear();

    const critical = screen.getByLabelText('Critical');
    fireEvent.click(critical);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalled();
      const [url] = router.replace.mock.calls.at(-1)!;
      const [, query = ''] = url.split('?');
      const params = new URLSearchParams(query);
      expect(params.get('sev')).toBe('High,Medium,Low,Info');
      expect(params.get('tags')).toBeNull();
      expect(params.get('page')).toBeNull();
    });

    router.replace.mockClear();

    const sshButton = screen.getByRole('button', { name: 'ssh' });
    fireEvent.click(sshButton);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalled();
      const [url] = router.replace.mock.calls.at(-1)!;
      const [, query = ''] = url.split('?');
      const params = new URLSearchParams(query);
      expect(params.get('sev')).toBe('High,Medium,Low,Info');
      expect(params.get('tags')).toBe('ssh');
      expect(params.get('page')).toBeNull();
    });
  });

  it('records pagination progress in the query string when scrolling', async () => {
    const plugins = createPlugins(60);
    mockFetch(plugins);
    const router = createRouter();
    useRouterMock.mockReturnValue(router as unknown as ReturnType<typeof useRouter>);

    render(<Nessus />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    router.replace.mockClear();

    const list = screen.getByRole('list');
    const initialItems = await screen.findAllByRole('listitem');
    expect(initialItems.length).toBeLessThan(60);
    Object.defineProperty(list, 'scrollTop', {
      configurable: true,
      get: () => 620,
    });
    Object.defineProperty(list, 'clientHeight', {
      configurable: true,
      get: () => 300,
    });
    Object.defineProperty(list, 'scrollHeight', {
      configurable: true,
      get: () => 900,
    });

    fireEvent.scroll(list);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalled();
      const [url] = router.replace.mock.calls.at(-1)!;
      const [, query = ''] = url.split('?');
      const params = new URLSearchParams(query);
      expect(params.get('page')).toBe('2');
    });

    const expandedItems = screen.getAllByRole('listitem');
    expect(expandedItems.length).toBe(60);
  });
});
