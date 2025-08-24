import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Key Converter',
  description:
    'Convert RSA/EC/OKP keys between PEM, DER, and JWK formats, validate curves and key uses, redact private material, compute thumbprints/x5c/x5t, and handle passphrase-protected keys',
};

export { default, displayKeyConverter } from '../../components/apps/key-converter';
