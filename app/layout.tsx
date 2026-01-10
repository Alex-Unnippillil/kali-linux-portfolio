import '../styles/tailwind.css';
import '../styles/globals.css';
import '../styles/index.css';
import '../styles/resume-print.css';
import '../styles/print.css';
import '@xterm/xterm/css/xterm.css';
import 'leaflet/dist/leaflet.css';

import type { ReactNode } from 'react';

export const metadata = {
  title: 'Kali Linux Portfolio',
  description: 'App pages rendered with server components',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ub-cool-grey text-white">
        {children}
      </body>
    </html>
  );
}
