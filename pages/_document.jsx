import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  /**
   * @param {import('next/document').DocumentContext} ctx
   */
  static async getInitialProps(ctx) {
    const initial = await Document.getInitialProps(ctx);
    const nonce = ctx?.res?.getHeader?.('x-csp-nonce');
    return { ...initial, nonce };
  }

  render() {
    const { nonce } = this.props;
    return (
      <Html lang="en" data-csp-nonce={nonce}>
        <Head>
          <link rel="icon" href="/images/logos/fevicon.b89c13d3.svg" type="image/svg+xml" />
          <link rel="alternate icon" href="/favicon.ico" />
          <link rel="apple-touch-icon" href="/images/logos/logo.3d30ab8f.png" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <link rel="preload" href="/images/logos/fevicon.6ecd8f54.png" as="image" type="image/png" />
          <link rel="preload" href="/images/logos/logo.3d30ab8f.png" as="image" type="image/png" />
          <link rel="preload" href="/images/logos/bitmoji.1b21789f.png" as="image" type="image/png" />
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
