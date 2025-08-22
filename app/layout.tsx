import 'tailwindcss/tailwind.css';
import '../styles/index.css';
import { Analytics } from '@vercel/analytics/react';
import React from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
