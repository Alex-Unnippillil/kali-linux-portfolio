import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CAA Checker',
  description: 'Inspect Certificate Authority Authorization records for a domain',
};

export { default, displayCaaChecker } from '../../components/apps/caa-checker';
