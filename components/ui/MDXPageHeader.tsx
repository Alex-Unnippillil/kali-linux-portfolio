import React from 'react';
import Link from 'next/link';

interface Crumb {
  label: string;
  href?: string;
}

interface Props {
  breadcrumbs: Crumb[];
  filePath: string;
}

const REPO_URL = 'https://github.com/unnippillil/kali-linux-portfolio';

const MDXPageHeader: React.FC<Props> = ({ breadcrumbs, filePath }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-1 text-blue-600">
          {breadcrumbs.map((crumb, idx) => (
            <li key={idx} className="flex items-center">
              {crumb.href ? (
                <Link href={crumb.href} className="hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
              {idx < breadcrumbs.length - 1 && <span className="mx-1">/</span>}
            </li>
          ))}
        </ol>
      </nav>
      <a
        href={`${REPO_URL}/edit/main/${filePath}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-gray-600 hover:text-gray-900 mt-2 sm:mt-0"
      >
        Edit this page
      </a>
    </div>
  );
};

export default MDXPageHeader;
