import fs from 'node:fs';
import path from 'node:path';
import Document, { Html, Head, Main, NextScript } from 'next/document';
import { Children, cloneElement, isValidElement } from 'react';

const CRITICAL_ROUTE_KEYS = {
  '/': 'home',
  '/apps': 'desktop',
};

const criticalCssDir = path.join(process.cwd(), '.next', 'cache', 'critical-css');
const criticalCssCache = new Map();

function readCriticalCss(key) {
  if (!key) return '';
  if (criticalCssCache.has(key)) {
    return criticalCssCache.get(key);
  }
  const filePath = path.join(criticalCssDir, `${key}.css`);
  try {
    const css = fs.readFileSync(filePath, 'utf8');
    criticalCssCache.set(key, css);
    return css;
  } catch {
    criticalCssCache.set(key, '');
    return '';
  }
}

class MyDocument extends Document {
  /**
   * @param {import('next/document').DocumentContext} ctx
   */
  static async getInitialProps(ctx) {
    const initial = await Document.getInitialProps(ctx);
    const nonce = ctx?.res?.getHeader?.('x-csp-nonce');
    const route = ctx?.pathname || ctx?.asPath || ctx?.req?.url?.split('?')[0] || '';
    const routeKey = CRITICAL_ROUTE_KEYS[route];
    const shouldOptimize =
      Boolean(routeKey) && (!process.env.NODE_ENV || process.env.NODE_ENV === 'production');

    let inlineCriticalCss = '';
    let asyncStyleLinks = [];
    let styles = initial.styles;

    if (shouldOptimize) {
      inlineCriticalCss = readCriticalCss(routeKey);
      const styleNodes = Children.toArray(initial.styles);
      const inline = [];
      const links = [];

      styleNodes.forEach((node) => {
        if (isValidElement(node) && node.type === 'link' && node.props?.rel === 'stylesheet') {
          links.push(node);
        } else {
          inline.push(node);
        }
      });

      asyncStyleLinks = links;
      styles = inline;
    }

    return {
      ...initial,
      styles,
      nonce,
      inlineCriticalCss,
      asyncStyleLinks,
      shouldOptimize,
    };
  }

  render() {
    const { nonce, inlineCriticalCss, asyncStyleLinks, shouldOptimize } = this.props;
    const hasAsyncStyles = shouldOptimize && asyncStyleLinks && asyncStyleLinks.length > 0;
    const preloadLinks = hasAsyncStyles
      ? asyncStyleLinks.map((link, index) =>
          cloneElement(link, {
            key: `critical-preload-${index}`,
            rel: 'preload',
            as: 'style',
            media: undefined,
            onLoad: undefined,
          })
        )
      : null;

    const asyncStylesheets = hasAsyncStyles
      ? asyncStyleLinks.map((link, index) =>
          cloneElement(link, {
            key: `critical-async-${index}`,
            rel: 'stylesheet',
            media: 'print',
            'data-critical-async': true,
          })
        )
      : null;

    const noscriptStyles = hasAsyncStyles
      ? asyncStyleLinks.map((link, index) =>
          cloneElement(link, {
            key: `critical-noscript-${index}`,
            rel: 'stylesheet',
            media: undefined,
          })
        )
      : null;

    const asyncLoaderScript = hasAsyncStyles
      ? {
          __html: `
            (function(){
              try {
                var links = document.querySelectorAll('link[data-critical-async]');
                links.forEach(function(link){
                  if (!link || link.media === 'all') return;
                  var enable = function(){ link.media = 'all'; };
                  link.addEventListener('load', enable, { once: true });
                  setTimeout(enable, 2000);
                });
              } catch (err) {
                console.error('critical-css loader failed', err);
              }
            })();
          `,
        }
      : null;

    return (
      <Html lang="en" data-csp-nonce={nonce}>
        <Head>
          <link rel="icon" href="/favicon.ico" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <meta name="theme-color" content="#0f1317" />
          {inlineCriticalCss ? (
            <style
              nonce={nonce}
              data-critical-css
              dangerouslySetInnerHTML={{ __html: inlineCriticalCss }}
            />
          ) : null}
          {preloadLinks}
          {asyncStylesheets}
          {noscriptStyles && <noscript>{noscriptStyles}</noscript>}
          {asyncLoaderScript && <script nonce={nonce} dangerouslySetInnerHTML={asyncLoaderScript} />}
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
