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
          <link rel="icon" href="/favicon.ico" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <meta name="theme-color" content="#0f1317" />
          <link rel="preconnect" href="https://vitals.vercel-insights.com" crossOrigin="anonymous" />
          <link rel="dns-prefetch" href="https://vitals.vercel-insights.com" />
          <link rel="preconnect" href="https://pings.vercel-insights.com" crossOrigin="anonymous" />
          <link rel="dns-prefetch" href="https://pings.vercel-insights.com" />
          <link rel="dns-prefetch" href="https://www.google-analytics.com" />
          <link rel="preconnect" href="https://www.google-analytics.com" crossOrigin="anonymous" />
          {/* eslint-disable-next-line @next/next/no-sync-scripts */}
          <script nonce={nonce} src="/theme.js" fetchPriority="high" />
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
