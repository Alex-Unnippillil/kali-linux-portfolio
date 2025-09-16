import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Ubuntu } from 'next/font/google';
import '../styles/tailwind.css';
import '../styles/globals.css';
import '../styles/index.css';
import '../styles/print.css';
import '../styles/resume-print.css';
import '@xterm/xterm/css/xterm.css';
import 'leaflet/dist/leaflet.css';

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
  fallback: ['Segoe UI', 'Noto Sans', 'Helvetica Neue', 'Arial', 'Liberation Sans', 'sans-serif'],
  preload: true,
});

export const metadata: Metadata = {
  title: 'Kali Linux Portfolio',
  description: 'A Kali/Ubuntu-inspired desktop portfolio experience built with Next.js.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </head>
      <body className={ubuntu.className}>{children}</body>
    </html>
  );
}
