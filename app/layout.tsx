import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';
import { Ubuntu } from 'next/font/google';

import '../styles/tailwind.css';
import '../styles/globals.css';
import '../styles/index.css';
import '../styles/resume-print.css';
import '../styles/print.css';
import '@xterm/xterm/css/xterm.css';
import 'leaflet/dist/leaflet.css';

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Kali Linux Portfolio',
    template: '%s | Kali Linux Portfolio',
  },
  description: 'Desktop-style portfolio featuring security tool simulations, utilities, and retro games.',
  manifest: '/manifest.webmanifest',
  themeColor: '#0f1317',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={ubuntu.className}>
        <Script src="/theme.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
