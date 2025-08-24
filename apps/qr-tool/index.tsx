import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'QR Tool',
  description:
    'Generate and scan QR codes with custom colors, logo overlays, and clipboard support.',
};

export { default, displayQrTool } from '../../components/apps/qr_tool';
