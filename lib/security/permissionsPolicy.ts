import type { IncomingHttpHeaders } from 'http';

interface PermissionsPolicyModule {
  DEFAULT_PERMISSIONS_POLICY: string;
  PERMISSIONS_POLICY_OVERRIDES: PermissionsPolicyOverride[];
  getPermissionsPolicy: (pathname: string) => string;
}

export interface PermissionsPolicyOverride {
  id: string;
  description: string;
  policy: string;
  matcher: RegExp;
  source: string;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires -- shared configuration lives in a CommonJS module for Next.js
const permissionsPolicy = require('./permissions-policy') as PermissionsPolicyModule;

export const DEFAULT_PERMISSIONS_POLICY = permissionsPolicy.DEFAULT_PERMISSIONS_POLICY;
export const PERMISSIONS_POLICY_OVERRIDES = permissionsPolicy.PERMISSIONS_POLICY_OVERRIDES;

export function getPermissionsPolicy(pathname: string): string {
  return permissionsPolicy.getPermissionsPolicy(pathname);
}

export function applyPermissionsPolicy(headers: Headers | IncomingHttpHeaders, pathname: string): void {
  const policy = getPermissionsPolicy(pathname);

  if (headers instanceof Headers) {
    headers.set('Permissions-Policy', policy);
    return;
  }

  // Node.js response headers object - mutate in place
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (headers as any)['Permissions-Policy'] = policy;
}
