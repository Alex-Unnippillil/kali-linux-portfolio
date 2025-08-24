import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CVSS Calculator',
  description: 'Build CVSS vectors and view live scores',
};

export { default, displayCvssCalculator } from '../../components/apps/cvss-calculator';
