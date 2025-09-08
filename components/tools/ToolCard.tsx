import type { ReactNode } from 'react';
import { getCategoryStyle } from '@/data/categoryColors';

interface ToolCardProps {
  name: string;
  category: string;
  children?: ReactNode;
}

export default function ToolCard({ name, category, children }: ToolCardProps) {
  const style = getCategoryStyle(category);
  return (
    <div className="rounded border p-4" style={style}>
      <h3 className="font-semibold mb-2">{name}</h3>
      {children && <div className="text-sm">{children}</div>}
    </div>
  );
}
