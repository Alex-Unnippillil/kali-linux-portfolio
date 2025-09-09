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
const WEB_IDE_BASE =
  'https://gitlab.com/-/ide/project/kalilinux/documentation/kali-docs/edit/master/-/';
const WEB_VIEW_BASE =
  'https://gitlab.com/kalilinux/documentation/kali-docs/-/blob/master/';

const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M16.862 5.487l1.651 1.651a2.25 2.25 0 010 3.182l-7.2 7.2a2.25 2.25 0 01-1.06.591l-3.04.76a.75.75 0 01-.91-.91l.76-3.04a2.25 2.25 0 01.59-1.06l7.201-7.2a2.25 2.25 0 013.182 0z"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.25 18.75h13.5"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M12 5v14M5 12h14"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LinkIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M13.828 10.172a4 4 0 015.657 5.656l-3 3a4 4 0 01-5.657-5.656m-3.657-3.657a4 4 0 015.657-5.656l3 3a4 4 0 01-5.657 5.656"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MDXPageHeader: React.FC<Props> = ({ breadcrumbs, filePath }) => {
  const docsPath = filePath
    .replace(/^content\//, '')
    .replace(/\.(mdx?|tsx)$/, '.md');
  const editUrl = `${WEB_IDE_BASE}${docsPath}`;
  const viewUrl = `${WEB_VIEW_BASE}${docsPath}`;
  const newUrl = `${WEB_IDE_BASE}${docsPath.substring(0, docsPath.lastIndexOf('/') + 1)}`;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center mb-4">
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
      <div className="mt-2 sm:mt-0 flex gap-2 w-full sm:w-auto justify-end sm:ml-auto">
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-gray-600 hover:text-gray-800"
          aria-label="View source"
        >
          <LinkIcon className="w-5 h-5" />
        </a>
        <a
          href={editUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-gray-600 hover:text-gray-800"
          aria-label="Edit this page"
        >
          <PencilIcon className="w-5 h-5" />
        </a>
        <a
          href={newUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-gray-600 hover:text-gray-800"
          aria-label="Create a new page"
        >
          <PlusIcon className="w-5 h-5" />
        </a>
      </div>
    </div>
  );
};

export default MDXPageHeader;
