import fs from 'node:fs';
import path from 'node:path';

import fg from 'fast-glob';

import {
  POLICY_NAME,
  __resetTrustedTypesPolicyForTests,
  trustedHtml,
} from '../utils/security/trusted-types';

describe('trusted types helpers', () => {
  beforeEach(() => {
    __resetTrustedTypesPolicyForTests();
    delete (globalThis as { trustedTypes?: unknown }).trustedTypes;
  });

  it('returns raw HTML when Trusted Types are unavailable', () => {
    expect(trustedHtml('<b>value</b>')).toEqual({ __html: '<b>value</b>' });
  });

  it('creates a policy when Trusted Types are supported', () => {
    const createHTML = jest.fn((input: string) => `trusted:${input}`);
    const policy = { createHTML } as unknown as TrustedTypePolicy;
    const createPolicy = jest.fn(() => policy);

    (globalThis as { trustedTypes?: unknown }).trustedTypes = {
      createPolicy,
    };

    expect(trustedHtml('<p>value</p>')).toEqual({ __html: 'trusted:<p>value</p>' });
    expect(createPolicy).toHaveBeenCalledWith(
      POLICY_NAME,
      expect.objectContaining({ createHTML: expect.any(Function) })
    );
    expect(createHTML).toHaveBeenCalledWith('<p>value</p>');

    expect(trustedHtml('again')).toEqual({ __html: 'trusted:again' });
    expect(createPolicy).toHaveBeenCalledTimes(1);
  });

  it('reuses existing policy if creation fails', () => {
    const createHTML = jest.fn((input: string) => input);
    const policy = { createHTML } as unknown as TrustedTypePolicy;
    const createPolicy = jest.fn(() => {
      throw new Error('exists');
    });
    const getPolicy = jest.fn(() => policy);

    (globalThis as { trustedTypes?: unknown }).trustedTypes = {
      createPolicy,
      getPolicy,
    };

    expect(trustedHtml('<div />')).toEqual({ __html: '<div />' });
    expect(getPolicy).toHaveBeenCalledWith(POLICY_NAME);
  });
});

describe('dangerouslySetInnerHTML usage', () => {
  it('always uses the trustedHtml helper', () => {
    const root = path.resolve(__dirname, '..');
    const files = fg.sync(['{components,apps,pages,src}/**/*.{js,jsx,ts,tsx}'], {
      cwd: root,
      ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
    });

    const offenders = files.filter((file) => {
      const content = fs.readFileSync(path.join(root, file), 'utf8');
      return content.includes('dangerouslySetInnerHTML={{');
    });

    expect(offenders).toEqual([]);
  });
});
