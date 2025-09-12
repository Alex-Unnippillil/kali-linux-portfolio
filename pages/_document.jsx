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
          <script nonce={nonce} src="/theme.js" />
        </Head>
        <body style={{ background: 'linear-gradient(#0f1317,#1a1f26)' }}>
          <Main />
          <NextScript nonce={nonce} />
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `document.addEventListener('DOMContentLoaded',function(){var wp=localStorage.getItem('bg-image')||'wall-2';document.body.style.setProperty('--wp-image','url(/wallpapers/' + wp + '.webp)');document.body.classList.add('wp-ready');});`,
            }}
          />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
