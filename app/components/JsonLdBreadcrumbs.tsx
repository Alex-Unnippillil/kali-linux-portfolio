import type { JSX } from 'react';
import { getCspNonce } from '@/utils/csp';

export interface BreadcrumbItem {
  /**
   * Human readable label displayed for the breadcrumb.
   */
  name: string;
  /**
   * Absolute URL to the breadcrumb target.
   */
  url: string;
}

export interface JsonLdBreadcrumbsProps {
  /**
   * Ordered breadcrumb trail where the first item is the root of the hierarchy.
   */
  items: ReadonlyArray<BreadcrumbItem>;
}

const JsonLdBreadcrumbs = ({ items }: JsonLdBreadcrumbsProps): JSX.Element | null => {
  if (!items?.length) {
    return null;
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  const nonce = getCspNonce();

  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
};

export default JsonLdBreadcrumbs;
