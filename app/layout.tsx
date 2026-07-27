import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="modulepreload" href="/scripts/apps/terminal.mjs" />
        <link rel="modulepreload" href="/scripts/apps/files.mjs" />
      </head>
      <body>{children}</body>
    </html>
  );
}
