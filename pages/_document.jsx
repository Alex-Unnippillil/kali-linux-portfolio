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
    const analyticsEnabled =
      process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';
    return (
      <Html lang="en" data-csp-nonce={nonce}>
        <Head>
          <link rel="icon" href="/favicon.ico" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <meta name="theme-color" content="#0f1317" />
          {analyticsEnabled && (
            <link
              rel="preconnect"
              href="https://vitals.vercel-analytics.com"
              crossOrigin=""
            />
          )}
          <link rel="preload" as="image" href="/wallpapers/wall-2.webp" />
          <link
            rel="preload"
            as="image"
            href="/themes/Yaru/status/icons8-kali-linux.svg"
            type="image/svg+xml"
          />
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
