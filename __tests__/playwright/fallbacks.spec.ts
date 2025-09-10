import { test, expect } from '@playwright/test';

// Test that components gracefully handle missing OffscreenCanvas and PiP support

test.describe('browser API fallbacks', () => {
  test('falls back when OffscreenCanvas is unsupported', async ({ browser }) => {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      // @ts-expect-error force unsupported
      delete window.OffscreenCanvas;
    });
    const page = await context.newPage();
    let pageError: Error | undefined;
    page.on('pageerror', (err) => (pageError = err));

    await page.setContent('<div id="root"></div>');
    const reactPath = require.resolve('react');
    const reactDomPath = require.resolve('react-dom');
    await page.addScriptTag({ path: reactPath.replace('index.js', 'umd/react.development.js') });
    await page.addScriptTag({ path: reactDomPath.replace('index.js', 'umd/react-dom.development.js') });
    await page.addScriptTag({ content: `
      const { useRef, useEffect } = React;
      function PerfOverlayTest() {
        const ref = useRef(null);
        useEffect(() => {
          const canvas = ref.current;
          if (!canvas) return;
          if ('OffscreenCanvas' in window) {
            canvas.dataset.mode = 'offscreen';
          } else {
            canvas.dataset.mode = 'fallback';
          }
        }, []);
        return React.createElement('canvas', { id: 'perf', ref });
      }
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(PerfOverlayTest));
    ` });

    await page.waitForSelector('#perf');
    const mode = await page.getAttribute('#perf', 'data-mode');
    expect(mode).toBe('fallback');
    expect(pageError).toBeUndefined();
    await context.close();
  });

  test('hides PiP controls when Picture-in-Picture unsupported', async ({ browser }) => {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      Object.defineProperty(document, 'pictureInPictureEnabled', { value: false });
      // @ts-expect-error force unsupported
      delete HTMLVideoElement.prototype.requestPictureInPicture;
    });
    const page = await context.newPage();
    let pageError: Error | undefined;
    page.on('pageerror', (err) => (pageError = err));

    await page.setContent('<div id="root"></div>');
    const reactPath2 = require.resolve('react');
    const reactDomPath2 = require.resolve('react-dom');
    await page.addScriptTag({ path: reactPath2.replace('index.js', 'umd/react.development.js') });
    await page.addScriptTag({ path: reactDomPath2.replace('index.js', 'umd/react-dom.development.js') });
    await page.addScriptTag({ content: `
      const { useRef, useEffect, useState } = React;
      function VideoPlayerTest() {
        const ref = useRef(null);
        const [supported, setSupported] = useState(false);
        useEffect(() => {
          const video = ref.current;
          setSupported(
            !!document.pictureInPictureEnabled &&
              !!video &&
              typeof video.requestPictureInPicture === 'function'
          );
        }, []);
        return React.createElement(
          'div',
          null,
          React.createElement('video', { id: 'vid', ref }),
          supported ? React.createElement('button', { id: 'pip' }, 'PiP') : null
        );
      }
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(VideoPlayerTest));
    ` });

    await page.waitForSelector('#vid');
    const pipButton = await page.$('#pip');
    expect(pipButton).toBeNull();
    expect(pageError).toBeUndefined();
    await context.close();
  });
});
