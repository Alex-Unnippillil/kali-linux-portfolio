import type { ReactNode, CSSProperties } from 'react';
import type { Metadata } from 'next';
import { Ubuntu } from 'next/font/google';

import '../styles/tailwind.css';
import '../styles/index.css';
import '../styles/resume-print.css';
import '../styles/print.css';
import '@xterm/xterm/css/xterm.css';
import 'leaflet/dist/leaflet.css';

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  variable: '--font-ubuntu',
});

const systemSansFallback = [
  'system-ui',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  'Ubuntu',
  'Cantarell',
  '"Noto Sans"',
  'sans-serif',
].join(', ');

const systemMonoFallback = [
  'ui-monospace',
  'SFMono-Regular',
  'SFMono-Text',
  'Menlo',
  'Monaco',
  'Consolas',
  '"Liberation Mono"',
  '"Courier New"',
  'monospace',
].join(', ');

const dyslexiaFallback = [
  '"Comic Sans MS"',
  '"Atkinson Hyperlegible"',
  'Arial',
  'sans-serif',
].join(', ');

const fontStackStyles = {
  '--font-stack-system-sans': systemSansFallback,
  '--font-stack-system-mono': systemMonoFallback,
  '--font-stack-dyslexia': dyslexiaFallback,
} satisfies CSSProperties;

export const metadata: Metadata = {
  title: 'Kali Linux Portfolio',
  description: 'Desktop-inspired security and retro tooling portfolio.',
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={ubuntu.variable}>
      <body className={ubuntu.className} style={fontStackStyles}>
        {children}
      </body>
    </html>
  );
}
