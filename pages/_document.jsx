import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  /**
   * @param {import('next/document').DocumentContext} ctx
   */
  static async getInitialProps(ctx) {
    const rawNonce =
      ctx?.res?.getHeader?.('x-nonce') ??
      ctx?.req?.headers?.['x-nonce'] ??
      ctx?.res?.getHeader?.('x-csp-nonce');

    const nonce = Array.isArray(rawNonce)
      ? rawNonce[0]
      : rawNonce != null
        ? String(rawNonce)
        : undefined;

    const originalRenderPage = ctx.renderPage;
    ctx.renderPage = (options = {}) => {
      const { enhanceApp, ...rest } = options;

      return originalRenderPage({
        ...rest,
        enhanceApp: (App) => {
          const EnhancedApp = enhanceApp ? enhanceApp(App) : App;
          return function AppWithNonce(appProps) {
            return <EnhancedApp {...appProps} cspNonce={nonce} />;
          };
        },
      });
    };

    const initial = await Document.getInitialProps(ctx);
    return { ...initial, nonce };
  }

  render() {
    const { nonce } = this.props;
    return (
      <Html lang="en" data-csp-nonce={nonce}>
        <Head>
          <link rel="icon" href="/favicon.ico" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <meta name="theme-color" content="#0f1317" />
          <script nonce={nonce} src="/theme.js" />
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
