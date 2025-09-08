import { test, expect } from '@playwright/test';

test('sets security headers for HTML responses', async ({ request }) => {
  const response = await request.get('/', { headers: { accept: 'text/html' } });
  const headers = response.headers();

  expect(headers['strict-transport-security']).toBe(
    'max-age=63072000; includeSubDomains; preload'
  );
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('same-origin');
  expect(headers['permissions-policy']).toBe(
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  );
});
