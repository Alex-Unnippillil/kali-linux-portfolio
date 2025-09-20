import type { Metadata } from 'next';
import { Ubuntu } from 'next/font/google';
import type { ReactNode } from 'react';

import '../styles/tailwind.css';
import '../styles/globals.css';
import '../styles/index.css';
import '../styles/resume-print.css';
import '../styles/print.css';

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Kali Linux Portfolio',
  description: 'Desktop-inspired portfolio featuring security tooling simulations and project showcases.',
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="bg-slate-950">
      <body className={`${ubuntu.className} bg-slate-950 text-slate-100 min-h-screen`}>{children}</body>
    </html>
  );
}
