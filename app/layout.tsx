import type { Metadata } from 'next';
import type { ReactNode } from 'react';
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
});

export const metadata: Metadata = {
  title: 'Streaming shells | Kali Linux Portfolio',
  description: 'Suspense-powered shells that stream server-rendered data with responsive skeleton fallbacks.',
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html lang="en">
      <body className={`${ubuntu.className} bg-slate-950 text-slate-100 antialiased`}>{children}</body>
    </html>
  );
}
