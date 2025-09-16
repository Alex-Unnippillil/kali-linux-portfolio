import type { ReactNode } from 'react';

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/print.css" media="print" />
      </head>
      <body>{children}</body>
    </html>
  );
}
