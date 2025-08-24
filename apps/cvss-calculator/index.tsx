import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CVSS Calculator',
  description: 'Compute CVSS v3.1 and v4.0 scores, copy vectors, and print reports',
  icons: '/themes/Yaru/apps/cvss.svg',
};

export { default, displayCvssCalculator } from '../../components/apps/cvss-calculator';
