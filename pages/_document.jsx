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
          <meta name="color-scheme" content="light dark" />
          <link rel="preload" href="assets/css/kali-tokens.css" as="style" />
          <link rel="stylesheet" href="assets/css/kali-tokens.css" />
          <link rel="stylesheet" href="assets/css/kali-components.css" />
          <script nonce={nonce} src="/theme.js" />
        </Head>
        <body>
          <Main />
          <script nonce={nonce} src="assets/js/kali-ui.js" defer></script>
          <NextScript nonce={nonce} />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
