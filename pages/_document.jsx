/* eslint-disable @next/next/no-sync-scripts */
import Document, { Html, Head, Main, NextScript } from 'next/document';
import { getDirection, normalizeLocale, parsePreferredLocale } from '../utils/direction';

class MyDocument extends Document {
  /**
   * @param {import('next/document').DocumentContext} ctx
   */
  static async getInitialProps(ctx) {
    const initial = await Document.getInitialProps(ctx);
    const nonce = ctx?.res?.getHeader?.('x-csp-nonce');
    const acceptLanguage = ctx?.req?.headers?.['accept-language'];
    const fallbackLocale = parsePreferredLocale(acceptLanguage);
    const resolvedLocale = normalizeLocale(
      ctx?.locale ?? initial?.locale ?? fallbackLocale ?? ctx?.defaultLocale ?? 'en',
    );
    const direction = getDirection(resolvedLocale);

    return { ...initial, nonce, locale: resolvedLocale, direction };
  }

  render() {
    const { nonce, locale, direction } = this.props;
    const resolvedLocale = normalizeLocale(locale ?? 'en');
    const resolvedDirection = direction ?? getDirection(resolvedLocale);
    return (
      <Html
        lang={resolvedLocale}
        dir={resolvedDirection}
        data-csp-nonce={nonce}
        data-locale={resolvedLocale}
        data-locale-direction={resolvedDirection}
      >
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
