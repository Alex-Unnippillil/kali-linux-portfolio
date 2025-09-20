import React from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import BaseDocument, { NextScript } from 'next/document';
import { HeadManagerContext } from 'next/dist/shared/lib/head-manager-context.shared-runtime';
import MyDocument from '../pages/_document.jsx';
import Meta from '../components/SEO/Meta';
import { AboutAlex } from '../components/apps/About';
import { CspNonceProvider } from '../utils/csp';

jest.mock('react-ga4', () => ({
  send: jest.fn(),
  event: jest.fn(),
  initialize: jest.fn(),
}));

const ensureFetchPolyfill = () => {
  if (typeof global.ReadableStream === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const streamWeb = require('stream/web');
    // @ts-ignore
    global.ReadableStream = streamWeb.ReadableStream;
  }
  if (
    typeof global.Request === 'undefined' ||
    typeof global.Response === 'undefined' ||
    typeof global.Headers === 'undefined' ||
    typeof global.fetch === 'undefined'
  ) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const edgeFetch = require('next/dist/compiled/@edge-runtime/primitives/fetch');
    if (typeof global.Request === 'undefined') {
      // @ts-ignore
      global.Request = edgeFetch.Request;
    }
    if (typeof global.Response === 'undefined') {
      // @ts-ignore
      global.Response = edgeFetch.Response;
    }
    if (typeof global.Headers === 'undefined') {
      // @ts-ignore
      global.Headers = edgeFetch.Headers;
    }
    if (typeof global.fetch === 'undefined') {
      // @ts-ignore
      global.fetch = edgeFetch.fetch;
    }
  }
};

let middleware: typeof import('../middleware').middleware;

beforeAll(async () => {
  ensureFetchPolyfill();
  ({ middleware } = await import('../middleware'));
});

afterEach(() => {
  cleanup();
  document.head.innerHTML = '';
  document.title = '';
  jest.restoreAllMocks();
});

describe('Content Security Policy nonce integration', () => {
  test('middleware sets nonce header and CSP policy without unsafe-inline', () => {
    const request = { headers: new Headers() } as any;
    const response = middleware(request);
    const nonce = response.headers.get('x-nonce');
    const csp = response.headers.get('Content-Security-Policy') ?? '';
    const scriptDirective = csp
      .split(';')
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith('script-src'));

    expect(typeof nonce).toBe('string');
    expect(nonce).not.toBe('');
    expect(csp).toContain(`'nonce-${nonce}'`);
    expect(scriptDirective).toBeDefined();
    expect(scriptDirective).not.toContain("'unsafe-inline'");
  });

  test('document renders nonce attributes on html and scripts', () => {
    const props: any = {
      __NEXT_DATA__: { props: {}, page: '/', query: {} },
      buildManifest: {
        polyfillFiles: [],
        devFiles: [],
        lowPriorityFiles: [],
        rootMainFiles: [],
        pages: {},
      },
      docComponentsRendered: { Head: false, Main: false, NextScript: false },
      head: [],
      html: '',
      inAmpMode: false,
      locale: undefined,
      defaultLocale: undefined,
      scriptLoader: [],
      styles: [],
      nonce: 'test-nonce',
    };

    const doc = new MyDocument(props);
    doc.props = props;
    const tree = doc.render();

    expect(tree.props['data-csp-nonce']).toBe('test-nonce');

    const [headEl, bodyEl] = React.Children.toArray(tree.props.children) as any[];
    const headChildren = React.Children.toArray(headEl.props.children);
    const inlineScript = headChildren.find((child: any) => child?.type === 'script');
    expect(inlineScript?.props?.nonce).toBe('test-nonce');

    const bodyChildren = React.Children.toArray(bodyEl.props.children);
    const nextScriptEl = bodyChildren.find((child: any) => child?.type === NextScript);
    expect(nextScriptEl?.props?.nonce).toBe('test-nonce');
  });

  test('document getInitialProps forwards nonce to the App component', async () => {
    const nonce = 'ctx-nonce';

    const renderPage = jest.fn((options: any = {}) => {
      const App = jest.fn(() => null);
      const EnhancedApp = options.enhanceApp ? options.enhanceApp(App) : App;
      const element = EnhancedApp({ Component: () => null, pageProps: {} });
      expect(element?.props?.cspNonce).toBe(nonce);
      return { html: '', head: [], styles: [] };
    });

    const ctx: any = {
      req: { headers: { 'x-nonce': nonce } },
      res: { getHeader: jest.fn() },
      renderPage,
    };

    jest.spyOn(BaseDocument, 'getInitialProps').mockImplementation(async (context: any) => {
      context.renderPage?.();
      return {
        html: '',
        head: [],
        styles: [],
      } as any;
    });

    const initial = await MyDocument.getInitialProps(ctx);

    expect(initial.nonce).toBe(nonce);
    expect(renderPage).toHaveBeenCalled();
  });

  test('inline scripts receive the nonce from context', async () => {
    const headElements: React.ReactElement[] = [];
    const headManager = {
      mountedInstances: new Set<unknown>(),
      updateHead: (elements: React.ReactElement[]) => {
        headElements.splice(0, headElements.length, ...elements);
      },
      updateScripts: () => {},
      updateLink: () => {},
      updateStyle: () => {},
    };

    await act(async () => {
      render(
        <HeadManagerContext.Provider value={headManager as any}>
          <CspNonceProvider nonce="inline-nonce">
            <>
              <Meta />
              <AboutAlex nonce="inline-nonce" />
            </>
          </CspNonceProvider>
        </HeadManagerContext.Provider>,
      );
    });

    await waitFor(() => {
      const scriptNonces = headElements
        .filter((element) => element.type === 'script')
        .map((element) => element.props?.nonce)
        .filter(Boolean);
      expect(scriptNonces.length).toBeGreaterThan(0);
      scriptNonces.forEach((nonce) => {
        expect(nonce).toBe('inline-nonce');
      });
    });
  });
});
