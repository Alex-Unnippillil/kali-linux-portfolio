import Document, { Html, Head, Main, NextScript } from 'next/document';
import getConfig from 'next/config';

class MyDocument extends Document {
  /**
   * @param {import('next/document').DocumentContext} ctx
   */
  static async getInitialProps(ctx) {
    const initial = await Document.getInitialProps(ctx);
    const nonce = ctx?.res?.getHeader?.('x-csp-nonce');
    const runtimeConfig = getConfig()?.publicRuntimeConfig ?? {};
    const hintMap = runtimeConfig.routePrefetchHints ?? {};
    const basePath = runtimeConfig.basePath || '';
    const rawPath =
      (typeof ctx?.asPath === 'string' && ctx.asPath.split('?')[0]) ||
      ctx?.pathname ||
      initial?.__NEXT_DATA__?.page ||
      '/';
    const normalizedPath = rawPath || '/';
    const hints = Array.isArray(hintMap[normalizedPath])
      ? hintMap[normalizedPath]
      : [];
    const withBasePath = (href) => {
      if (typeof href !== 'string' || !href.startsWith('/')) return href;
      if (!basePath) return href;
      if (href === '/') {
        return basePath || '/';
      }
      return `${basePath}${href}`;
    };
    const routePrefetchLinks = hints.map((hint) => ({
      ...hint,
      href: withBasePath(hint.href),
    }));
    return { ...initial, nonce, routePrefetchLinks };
  }

  render() {
    const { nonce, routePrefetchLinks = [] } = this.props;
    return (
      <Html lang="en" data-csp-nonce={nonce}>
        <Head>
          <link rel="icon" href="/favicon.ico" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <meta name="theme-color" content="#0f1317" />
          <script nonce={nonce} src="/theme.js" defer />
          {routePrefetchLinks.map((hint) => {
            const rel = hint.rel || 'prefetch';
            return (
              <link
                key={`${rel}-${hint.href}-${hint.as || 'document'}`}
                rel={rel}
                href={hint.href}
                {...(hint.as ? { as: hint.as } : {})}
                {...(hint.crossOrigin ? { crossOrigin: hint.crossOrigin } : {})}
              />
            );
          })}
        </Head>
        <body>
          <Main />
          <NextScript nonce={nonce} />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
