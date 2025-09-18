import { test, expect } from '@playwright/test';
import type { CDPSession } from 'playwright-core';

async function stopTracing(client: CDPSession) {
  const tracingComplete = new Promise<{ stream: string }>((resolve) => {
    client.once('Tracing.tracingComplete', resolve);
  });
  await client.send('Tracing.end');
  const { stream } = await tracingComplete;
  const chunks: string[] = [];
  while (true) {
    const { data, eof } = await client.send('IO.read', { handle: stream });
    chunks.push(Buffer.from(data, 'base64').toString());
    if (eof) break;
  }
  await client.send('IO.close', { handle: stream });
  const trace = JSON.parse(chunks.join(''));
  return Array.isArray(trace.traceEvents) ? trace.traceEvents : [];
}

test.describe('window overview', () => {
  test('produces GPU compositor frames during overview animation', async ({ context, page }) => {
    const client = await context.newCDPSession(page);
    await client.send('Tracing.start', {
      transferMode: 'ReturnAsStream',
      categories:
        'devtools.timeline,disabled-by-default-devtools.timeline.frame,disabled-by-default-devtools.timeline.picture,disabled-by-default-devtools.timeline.layers',
      options: 'sampling-frequency=1000',
    });

    await page.goto('/');
    await page.waitForSelector('#desktop');

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('desktop:open-overview'));
    });

    await page.waitForSelector('[data-testid="window-overview"]');
    await page.waitForTimeout(350);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('desktop:close-overview'));
    });
    await page.waitForSelector('[data-testid="window-overview"]', { state: 'detached' });

    const events = await stopTracing(client);
    const hasCompositorEvent = events.some((event: any) => {
      if (!event || typeof event.name !== 'string') return false;
      if (event.name === 'SubmitCompositorFrame' || event.name === 'VizCompositorFrame') return true;
      if (typeof event.cat === 'string' && event.cat.includes('gpu')) return true;
      return false;
    });

    expect(hasCompositorEvent).toBeTruthy();

    const transforms = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.opened-window')).map((node) => ({
        transform: window.getComputedStyle(node as Element).transform,
        willChange: (node as HTMLElement).style.willChange,
      })),
    );

    expect(transforms.some((entry) => entry.transform.includes('matrix3d') || entry.transform.includes('translate3d'))).toBeTruthy();
    expect(transforms.every((entry) => entry.willChange.includes('transform'))).toBeTruthy();
  });
});
