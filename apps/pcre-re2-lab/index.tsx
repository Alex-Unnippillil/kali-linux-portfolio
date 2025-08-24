import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PCRE RE2 Lab',
  description: 'Compare PCRE2 and RE2 regex engines',
};

export { default, displayPcreRe2Lab } from '../../components/apps/pcre-re2-lab';
