
import React from 'react';
import '../styles/tailwind.css';
import '../styles/globals.css';
import '../styles/index.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
