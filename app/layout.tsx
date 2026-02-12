import type { ReactNode } from 'react';
import { jetbrains } from './fonts';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={jetbrains.className}>
      <body>{children}</body>
    </html>
  );
}
