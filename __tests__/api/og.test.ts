/** @jest-environment node */

jest.mock('@vercel/og');

import handler from '../../pages/api/og';
import { NextRequest } from 'next/server';

describe('/api/og', () => {
  it('renders a dark theme OG image with cache headers', async () => {
    const request = new NextRequest('https://example.com/api/og?title=Unit+Test&badge=Edge');
    const response = await handler(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, s-maxage=86400, stale-while-revalidate=604800');
    expect(response.headers.get('content-type')).toContain('image/');

    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });

  it('renders a light theme OG image for alternate locale', async () => {
    const request = new NextRequest('https://example.com/api/og?title=Locale+Preview&theme=light&locale=fr-CA');
    const response = await handler(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image/');

    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });
});
