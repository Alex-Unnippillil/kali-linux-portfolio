export interface DefinedTermInput {
  name: string;
  description?: string;
  url: string;
  inDefinedTermSet?: string;
}

export function buildDefinedTerm({ name, description, url, inDefinedTermSet }: DefinedTermInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name,
    description,
    url,
    inDefinedTermSet,
  };
}

export interface BreadcrumbInput {
  name: string;
  url: string;
}

export function buildBreadcrumbList(items: BreadcrumbInput[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
