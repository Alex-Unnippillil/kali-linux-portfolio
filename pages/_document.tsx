import Document, {
  Html,
  Head,
  Main,
  NextScript,
  type DocumentContext,
  type DocumentInitialProps,
} from 'next/document';
import { Ubuntu } from 'next/font/google';

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-ubuntu',
  display: 'optional',
  preload: true,
});

interface Props extends DocumentInitialProps {
  nonce?: string;
}

class MyDocument extends Document<Props> {
  static async getInitialProps(ctx: DocumentContext): Promise<Props> {
    const initial = await Document.getInitialProps(ctx);
    const nonce = ctx.req.headers['x-csp-nonce'] as string | undefined;
    return { ...initial, nonce };
  }

  render() {
    const { nonce } = this.props;
    return (
      <Html
        lang={this.props.locale || 'en'}
        data-csp-nonce={nonce}
        className={ubuntu.variable}
      >
        <Head>
          <link rel="icon" href="/favicon.ico" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <meta name="theme-color" content="#0f1317" />
          <script nonce={nonce} src="/theme.js" async />
        </Head>
        <body className="font-ubuntu">
          <Main />
          <NextScript nonce={nonce} />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
