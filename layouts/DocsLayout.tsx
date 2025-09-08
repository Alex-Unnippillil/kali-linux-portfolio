import { ReactNode } from 'react';
import Breadcrumbs, { BreadcrumbItem } from '@/components/navigation/Breadcrumbs';

interface DocsLayoutProps {
  items: BreadcrumbItem[];
  children: ReactNode;
}

export default function DocsLayout({ items, children }: DocsLayoutProps) {
  return (
    <div className="p-4">
      <Breadcrumbs items={items} />
      {children}
    </div>
  );
}
