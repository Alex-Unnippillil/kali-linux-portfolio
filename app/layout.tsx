import type { Metadata } from 'next';
import { Ubuntu } from 'next/font/google';
import '../styles/tailwind.css';
import '../styles/globals.css';
import '../styles/index.css';
import '../styles/resume-print.css';
import '../styles/print.css';
import '@xterm/xterm/css/xterm.css';
import 'leaflet/dist/leaflet.css';
import type { ReactNode } from 'react';

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
});

export const metadata: Metadata = {
  title: 'Kali Linux Portfolio',
  description:
    'A desktop-style security lab and portfolio experience built with Next.js',
};

type RootLayoutProps = {
  children: ReactNode;
  modal: ReactNode;
};

export default function RootLayout({ children, modal }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${ubuntu.className} bg-[#020617] text-white`}>
        {children}
        {modal}
      </body>
    </html>
  );
}
