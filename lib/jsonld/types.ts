export type AuthorInput =
  | string
  | AuthorDescriptor
  | Array<string | AuthorDescriptor>;

export interface AuthorDescriptor {
  name?: string;
  url?: string;
  type?: 'Person' | 'Organization';
  ['@type']?: 'Person' | 'Organization';
}

export interface ProjectFrontmatter {
  title?: string;
  headline?: string;
  summary?: string;
  description?: string;
  excerpt?: string;
  type?: string;
  contentType?: string;
  layout?: string;
  schemaType?: string;
  jsonLdType?: string;
  author?: AuthorInput;
  authors?: AuthorInput;
  by?: AuthorInput;
  creator?: AuthorInput;
  tags?: string[] | string;
  keywords?: string[] | string;
  topics?: string[] | string;
  image?: string | string[];
  images?: string | string[];
  cover?: string | string[];
  coverImage?: string | string[];
  hero?: string | string[];
  thumbnail?: string;
  banner?: string | string[];
  date?: string;
  published?: string;
  datePublished?: string;
  lastModified?: string;
  updated?: string;
  dateModified?: string;
  repo?: string;
  repository?: string;
  codeRepository?: string;
  programmingLanguage?: string;
  language?: string;
  runtime?: string;
  runtimePlatform?: string;
  operatingSystem?: string;
  os?: string;
  platform?: string;
  applicationCategory?: string;
  categoryLabel?: string;
  downloadUrl?: string;
  download?: string;
  version?: string;
  softwareVersion?: string;
  license?: string;
  url?: string;
  articleSection?: string;
  section?: string;
  category?: string;
  sameAs?: string[] | string;
  links?: string[] | string;
  slug?: string;
}

export interface JsonLdPerson {
  '@type': 'Person';
  name: string;
  url?: string;
}

export interface JsonLdOrganization {
  '@type': 'Organization';
  name: string;
  url?: string;
}

export type JsonLdAuthor = JsonLdPerson | JsonLdOrganization;

export interface ArticleJsonLd {
  '@context': 'https://schema.org';
  '@type': 'Article';
  headline: string;
  author: JsonLdAuthor | JsonLdAuthor[];
  description?: string;
  url?: string;
  mainEntityOfPage?: {
    '@type': 'WebPage';
    '@id': string;
  };
  image?: string | string[];
  keywords?: string[];
  datePublished?: string;
  dateModified?: string;
  articleSection?: string;
}

export interface SoftwareSourceCodeJsonLd {
  '@context': 'https://schema.org';
  '@type': 'SoftwareSourceCode';
  headline: string;
  name: string;
  author: JsonLdAuthor | JsonLdAuthor[];
  description?: string;
  url?: string;
  mainEntityOfPage?: {
    '@type': 'WebPage';
    '@id': string;
  };
  image?: string | string[];
  keywords?: string[];
  datePublished?: string;
  dateModified?: string;
  codeRepository?: string;
  programmingLanguage?: string;
  runtimePlatform?: string;
  operatingSystem?: string;
  applicationCategory?: string;
  downloadUrl?: string;
  version?: string;
  license?: string;
  sameAs?: string[];
}

export type ProjectJsonLd = ArticleJsonLd | SoftwareSourceCodeJsonLd;
