import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#1793d1" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#bb86fc" media="(prefers-color-scheme: dark)" />
      </head>
      <body>{children}</body>
    </html>
  );
}
