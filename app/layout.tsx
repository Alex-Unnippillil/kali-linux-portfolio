'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Titlebar from './components/Titlebar';
import '../styles/globals.css';

interface Props {
  children: ReactNode;
}

export default function RootLayout({ children }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const overlay = (navigator as any).windowControlsOverlay;
    const update = () => setVisible(Boolean(overlay?.visible));
    update();
    overlay?.addEventListener('geometrychange', update);
    return () => overlay?.removeEventListener('geometrychange', update);
  }, []);

  return (
    <html lang="en">
      <body>
        {visible && <Titlebar />}
        {children}
      </body>
    </html>
  );
}
