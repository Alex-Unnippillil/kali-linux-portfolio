import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Base Encoders',
  description: 'Encode and decode text using various base encodings',
};

export { default, displayBaseEncoders } from '../../components/apps/base-encoders';
