import Document, { Html, Head, Main, NextScript } from 'next/document';
import React from 'react';
import fs from 'fs';
import path from 'path';

const criticalCss = fs.readFileSync(
  path.join(process.cwd(), 'styles', 'critical.css'),
  'utf8',
);

class MyDocument extends Document {
  /**
   * @param {import('next/document').DocumentContext} ctx
   */
  static async getInitialProps(ctx) {
    const initial = await Document.getInitialProps(ctx);
    const nonce = ctx?.res?.getHeader?.('x-csp-nonce');

    const styles = React.Children.map(initial.styles, (child) => {
      if (
        React.isValidElement(child) &&
        child.type === 'link' &&
        child.props.rel === 'stylesheet'
      ) {
        return React.cloneElement(child, {
          media: 'print',
          onLoad: "this.media='all'",
        });
      }
      return child;
    });

    return { ...initial, nonce, styles };
  }

  render() {
    const { nonce } = this.props;
    return (
      <Html lang="en" data-csp-nonce={nonce}>
        <Head>
          <link rel="icon" href="/favicon.ico" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <meta name="theme-color" content="#0f1317" />
          <style dangerouslySetInnerHTML={{ __html: criticalCss }} />
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
