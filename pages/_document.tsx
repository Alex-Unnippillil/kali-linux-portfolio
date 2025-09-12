import Document, {
  Html,
  Head,
  Main,
  NextScript,
  DocumentContext,
} from 'next/document';

// Tab order: panel → dock → desktop. Skip links jump to each section.
class MyDocument extends Document<{ nonce?: string }> {
  static async getInitialProps(ctx: DocumentContext) {
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
          <script nonce={nonce} src="/theme.js" defer />
        </Head>
        <body>
          <nav aria-label="Skip links" className="skip-links">
            <a href="#panel" className="skip-link">
              Skip to panel
            </a>
            <a href="#dock" className="skip-link">
              Skip to dock
            </a>
            <a href="#desktop" className="skip-link">
              Skip to desktop
            </a>
          </nav>
          <Main />
          <NextScript nonce={nonce} />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
