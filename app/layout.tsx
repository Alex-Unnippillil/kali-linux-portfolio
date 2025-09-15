import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Ubuntu } from 'next/font/google';

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
});

export const metadata: Metadata = {
  title: {
    default: 'Kali Linux Portfolio',
    template: '%s | Kali Linux Portfolio',
  },
  description:
    'Reference documentation and simulations for the Kali Linux Portfolio desktop experience.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={ubuntu.className}>
      <body
        style={{
          margin: 0,
          backgroundColor: '#050816',
          color: '#e5e7eb',
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  );
}
