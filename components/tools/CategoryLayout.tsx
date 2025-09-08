import { ReactNode } from 'react';

interface CategoryLayoutProps {
  children: ReactNode;
  className?: string;
}

export default function CategoryLayout({ children, className = '' }: CategoryLayoutProps) {
  return <div className={`p-4 space-y-6 ${className}`}>{children}</div>;
}

