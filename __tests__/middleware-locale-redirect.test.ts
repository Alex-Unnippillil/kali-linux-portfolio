/** @jest-environment node */
import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

describe('middleware locale redirect', () => {
  function makeReq(lang: string) {
    return new NextRequest('http://localhost/', {
      headers: { 'accept-language': lang },
    });
  }

  it('redirects to /en when Accept-Language is en', () => {
    const req = makeReq('en');
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toBe('http://localhost/en/');
  });

  it('redirects to /es when Accept-Language is es', () => {
    const req = makeReq('es');
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toBe('http://localhost/es/');
  });
});
