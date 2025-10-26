import type { ReactNode } from 'react';

interface DesktopLayoutProps {
  children: ReactNode;
  modal: ReactNode;
}

export default function DesktopLayout({ children, modal }: DesktopLayoutProps) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
