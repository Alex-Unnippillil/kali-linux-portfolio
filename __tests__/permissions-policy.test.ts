/** @jest-environment node */

import { webcrypto } from 'crypto';
import { NextRequest } from 'next/server';

import { middleware } from '../middleware';
import {
  DEFAULT_PERMISSIONS_POLICY,
  PERMISSIONS_POLICY_OVERRIDES,
  getPermissionsPolicy,
} from '../lib/security/permissionsPolicy';

describe('permissions policy configuration', () => {
  beforeAll(() => {
    if (!globalThis.crypto) {
      // @ts-expect-error - Jest's node environment lacks a webcrypto implementation
      globalThis.crypto = webcrypto;
    }
  });

  it('returns the default policy for unrelated paths', () => {
    expect(getPermissionsPolicy('/')).toBe(DEFAULT_PERMISSIONS_POLICY);
    expect(getPermissionsPolicy('/apps/weather')).toBe(DEFAULT_PERMISSIONS_POLICY);
  });

  it('applies overrides for approved routes', () => {
    const qrOverride = PERMISSIONS_POLICY_OVERRIDES.find((entry) => entry.id === 'qr-scanner-camera');
    expect(qrOverride).toBeDefined();
    expect(getPermissionsPolicy('/apps/qr')).toBe(qrOverride?.policy);
    expect(getPermissionsPolicy('/apps/qr/scan')).toBe(qrOverride?.policy);
  });

  it('middleware attaches the resolved policy to responses', () => {
    const request = new NextRequest('https://example.com/apps/qr');
    const response = middleware(request);
    expect(response.headers.get('Permissions-Policy')).toBe(getPermissionsPolicy('/apps/qr'));
  });
});
