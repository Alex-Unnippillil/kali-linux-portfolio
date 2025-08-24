import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Key Converter',
  description: 'Convert RSA/EC/OKP keys between PEM, DER, and JWK formats',
};

export { default, displayKeyConverter } from '../../components/apps/key-converter';
