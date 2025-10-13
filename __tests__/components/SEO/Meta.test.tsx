import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import type { NextRouter } from 'next/router';
import { useRouter } from 'next/router';
import Meta from '../../../components/SEO/Meta';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function createMockRouter(overrides: Partial<NextRouter> = {}): NextRouter {
  return {
    basePath: '',
    pathname: '/',
    route: '/',
    query: {},
    asPath: '/',
    back: jest.fn(),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
    forward: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
    push: jest.fn().mockResolvedValue(true),
    reload: jest.fn(),
    replace: jest.fn().mockResolvedValue(true),
    isFallback: false,
    isLocaleDomain: false,
    isPreview: false,
    isReady: true,
    ...overrides,
  } as unknown as NextRouter;
}

describe('Meta SEO component', () => {
  const useRouterMock = useRouter as jest.MockedFunction<typeof useRouter>;

  beforeEach(() => {
    document.head.innerHTML = '';
  });

  afterEach(() => {
    useRouterMock.mockReset();
  });

  it('renders canonical and alternate links for the default locale', () => {
    const router = createMockRouter({ asPath: '/' });
    useRouterMock.mockReturnValue(router);
    render(<Meta />);

    const canonical = document.head.querySelector('link[rel="canonical"]');
    expect(canonical).not.toBeNull();
    expect(canonical).toHaveAttribute('href', 'https://unnippillil.com/');

    const alternates = Array.from(
      document.head.querySelectorAll('link[rel="alternate"]'),
    ).map((link) => ({
      hrefLang: link.getAttribute('hreflang'),
      href: link.getAttribute('href'),
    }));

    expect(alternates).toEqual(
      expect.arrayContaining([
        { hrefLang: 'en-CA', href: 'https://unnippillil.com/' },
        { hrefLang: 'x-default', href: 'https://unnippillil.com/' },
      ]),
    );
  });

  it('normalizes query strings and fragments when building canonical URLs', () => {
    const router = createMockRouter({ asPath: '/projects?ref=1#intro' });
    useRouterMock.mockReturnValue(router);
    render(<Meta />);

    const canonical = document.head.querySelector('link[rel="canonical"]');
    expect(canonical).not.toBeNull();
    expect(canonical).toHaveAttribute('href', 'https://unnippillil.com/projects');

    const alternates = Array.from(
      document.head.querySelectorAll('link[rel="alternate"]'),
    ).map((link) => ({
      hrefLang: link.getAttribute('hreflang'),
      href: link.getAttribute('href'),
    }));

    expect(alternates).toEqual(
      expect.arrayContaining([
        { hrefLang: 'en-CA', href: 'https://unnippillil.com/projects' },
        { hrefLang: 'x-default', href: 'https://unnippillil.com/projects' },
      ]),
    );
  });
});
