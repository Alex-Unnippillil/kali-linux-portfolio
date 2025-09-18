import Document, { Html, Head, Main, NextScript, type DocumentContext } from 'next/document';
import Script from 'next/script';

import { getTokenValue } from '../lib/designTokens';

class MyDocument extends Document<{ nonce?: string }> {
  static async getInitialProps(ctx: DocumentContext) {
    const initial = await Document.getInitialProps(ctx);
    const nonce = ctx?.res?.getHeader?.('x-csp-nonce');
    return { ...initial, nonce };
  }

  render() {
    const { nonce } = this.props as { nonce?: string };
    const themeColor = getTokenValue('surface', 'ground');
    return (
      <Html lang="en" data-csp-nonce={nonce}>
        <Head>
          <link rel="icon" href="/favicon.ico" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <meta name="theme-color" content={themeColor} />
          <Script nonce={nonce} src="/theme.js" strategy="beforeInteractive" />
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
