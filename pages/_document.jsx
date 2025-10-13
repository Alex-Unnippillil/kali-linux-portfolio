import Document, { Html, Head, Main, NextScript } from 'next/document';
import Script from 'next/script';

class MyDocument extends Document {
  /**
   * @param {import('next/document').DocumentContext} ctx
   */
  static async getInitialProps(ctx) {
    const initial = await Document.getInitialProps(ctx);
    const nonce = ctx?.res?.getHeader?.('x-csp-nonce');
    const locale = ctx?.locale ?? ctx?.defaultLocale ?? 'en';
    return { ...initial, nonce, locale };
  }

  render() {
    const { nonce, locale: providedLocale } = this.props;
    const detectedLocale =
      typeof providedLocale === 'string'
        ? providedLocale
        : this.props?.__NEXT_DATA__?.locale ?? 'en';
    const direction = /^(ar|fa|he|ur)(-|$)/i.test(detectedLocale) ? 'rtl' : 'ltr';
    return (
      <Html lang={detectedLocale} dir={direction} data-locale={detectedLocale} data-csp-nonce={nonce}>
        <Head>
          <link rel="icon" href="/favicon.ico" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <meta name="theme-color" content="#0f1317" />
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
