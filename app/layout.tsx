import type { ReactNode } from 'react';
import { Ubuntu } from 'next/font/google';
import DesktopProviders from '@/components/app/DesktopProviders';
import ErrorBoundary from '@/components/core/ErrorBoundary';
import '@/styles/tailwind.css';
import '@/styles/globals.css';
import '@/styles/index.css';
import '@/styles/resume-print.css';
import '@/styles/print.css';
import '@xterm/xterm/css/xterm.css';
import 'leaflet/dist/leaflet.css';

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={ubuntu.className}>
        <a
          href="#app-grid"
          className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-2 focus:bg-white focus:text-black"
        >
          Skip to app grid
        </a>
        <ErrorBoundary>
          <DesktopProviders>{children}</DesktopProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}
