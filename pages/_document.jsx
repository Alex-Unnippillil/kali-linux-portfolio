import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  /**
   * @param {import('next/document').DocumentContext} ctx
   */
  static async getInitialProps(ctx) {
    const nonceHeader = ctx?.res?.getHeader?.('x-csp-nonce');
    const nonce = Array.isArray(nonceHeader) ? nonceHeader[0] : nonceHeader;
    const originalRenderPage = ctx.renderPage;

    const initial = await Document.getInitialProps({
      ...ctx,
      renderPage: () =>
        originalRenderPage({
          enhanceApp: (App) =>
            function EnhancedApp(appProps) {
              return <App {...appProps} cspNonce={nonce} />;
            },
        }),
    });

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
