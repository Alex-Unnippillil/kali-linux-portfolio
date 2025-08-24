import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'License Classifier',
  description: 'Scan files for SPDX license identifiers and conflicts.',
};

export { default, displayLicenseClassifier } from '../../components/apps/license-classifier';
