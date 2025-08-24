import Document, {
  Html,
  Head,
  Main,
  NextScript,
  DocumentContext,
  DocumentInitialProps,
} from 'next/document';
import React from 'react';

interface MyDocumentProps extends DocumentInitialProps {
  nonce?: string;
}

class MyDocument extends Document<MyDocumentProps> {
  static async getInitialProps(
    ctx: DocumentContext
  ): Promise<MyDocumentProps> {
    const nonce = ctx.req?.headers['x-nonce'] as string | undefined;
    const initialProps = await Document.getInitialProps({
      ...ctx,
      renderPage: () =>
        ctx.renderPage({
          enhanceApp: (App) => (props) => (
            <App {...props} pageProps={{ ...props.pageProps, nonce }} />
          ),
        }),
    });
    return { ...initialProps, nonce };
  }

  render() {
    const nonce = (this.props as MyDocumentProps).nonce;
    return (
      <Html lang="en">
        <Head nonce={nonce} />
        <body>
          <Main />
          <NextScript nonce={nonce} />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
