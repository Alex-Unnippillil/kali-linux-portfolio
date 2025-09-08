import Link from 'next/link';

export interface BreadcrumbItem {
  href: string;
  label: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`hidden md:block text-sm text-gray-600 dark:text-gray-300 ${className}`}
    >
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, idx) => (
          <li key={item.href} className="flex items-center gap-2">
            {idx > 0 && <span>/</span>}
            {idx === items.length - 1 ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:underline">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
