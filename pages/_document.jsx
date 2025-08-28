import Document, { Html, Head, Main, NextScript } from 'next/document';
import Script from 'next/script';
import crypto from 'node:crypto';

class MyDocument extends Document {
  /**
   * @param {import('next/document').DocumentContext} ctx
   */
  static async getInitialProps(ctx) {
    const nonce = crypto.randomBytes(16).toString('base64');
    const initialProps = await Document.getInitialProps(ctx);
    const csp = ctx.res?.getHeader('Content-Security-Policy');
    if (csp) {
      ctx.res.setHeader(
        'Content-Security-Policy',
        csp.toString().replace(/__CSP_NONCE__/g, nonce),
      );
    }
    return { ...initialProps, nonce };
  }

  render() {
    const { nonce } = this.props;
    return (
      <Html lang="en" data-csp-nonce={nonce}>
        <Head>
          <link rel="manifest" href="/manifest.webmanifest" />
          <meta name="theme-color" content="#0f1317" />
          <Script
            src="/theme.js"
            strategy="afterInteractive"
            nonce={nonce}
            // Apply theme once the page is interactive to avoid blocking initial paint
          />
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
