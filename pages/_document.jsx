import Document, { Html, Head, Main, NextScript } from 'next/document';
import Script from 'next/script';

class MyDocument extends Document {
  /**
   * @param {import('next/document').DocumentContext} ctx
   */
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    return (
      <Html lang="en">
        <Head>
          <link rel="manifest" href="/manifest.webmanifest" />
          <meta name="theme-color" content="#0f1317" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link
            rel="preload"
            href="https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap"
            as="style"
            crossOrigin="anonymous"
            fetchPriority="high"
          />
          <link
            rel="preload"
            href="/images/logos/logo.png"
            as="image"
            fetchPriority="high"
          />
          <link
            rel="preload"
            href="/images/logos/bitmoji.png"
            as="image"
          />
          <Script src="/theme.js" strategy="beforeInteractive" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
