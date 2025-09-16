import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  metadataBase: new URL('https://unnippillil.com'),
  title: {
    default: 'Kali Linux Portfolio',
    template: '%s | Kali Linux Portfolio',
  },
  description:
    'A desktop-style portfolio that emulates a Kali and Ubuntu experience with simulated security tools, utilities, and retro games.',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
