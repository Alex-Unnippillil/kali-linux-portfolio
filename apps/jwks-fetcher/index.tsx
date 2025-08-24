import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'JWKS Fetcher',
  description:
    'Fetch and cache JSON Web Keys by issuer or JWKS URL, verify JWTs, and detect key rotation',
};

export { default, displayJwksFetcher } from '../../components/apps/jwks-fetcher';
