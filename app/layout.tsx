import '../styles/index.css';
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100 p-4">
        {children}
      </body>
    </html>
  );
}
