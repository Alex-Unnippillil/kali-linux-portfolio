import type { ReactNode } from 'react';
import WebVitals from './ui/WebVitals';

const isDevelopment = process.env.NODE_ENV === 'development';

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body>
        {children}
        {isDevelopment ? <WebVitals /> : null}
      </body>
    </html>
  );
}
