import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Kali Linux Portfolio',
  description: 'Desktop-style portfolio inspired by Kali Linux.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-kali-bg text-white antialiased">{children}</body>
    </html>
  );
}

