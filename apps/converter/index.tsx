import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Converter',
  description: 'Convert units, bytes, time, encodings, and text',
};

export { default, displayConverter } from '../../components/apps/converter';
