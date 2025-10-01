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
          <link rel="icon" type="image/svg+xml" href="/icons/brand-outline.svg" />
          <link rel="icon" type="image/svg+xml" sizes="48x48" href="/icons/48/brand-outline.svg" />
          <link rel="icon" type="image/svg+xml" sizes="64x64" href="/icons/64/brand-outline.svg" />
          <link rel="icon" type="image/svg+xml" sizes="128x128" href="/icons/128/brand-outline.svg" />
          <link rel="icon" type="image/svg+xml" sizes="256x256" href="/icons/256/brand-outline.svg" />
          <link rel="apple-touch-icon" href="/icons/256/brand-filled.svg" />
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
