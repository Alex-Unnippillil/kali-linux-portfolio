import type { Content, Heading, Root } from 'mdast';
import type { Data } from 'unist';

export const HEADING_METADATA_KEY = 'headings';
export const TOC_DATA_KEY = 'toc';

export interface TocEntry {
  id: string;
  depth: number;
  value: string;
  line: number | null;
}

export interface HeadingIdPluginOptions {
  /**
   * Smallest heading depth that should be included in the generated table of contents.
   * All headings, regardless of depth, receive stable IDs.
   */
  minDepth?: number;
  /**
   * Largest heading depth that should be included in the generated table of contents.
   */
  maxDepth?: number;
  /**
   * Optional callback invoked with a cloned list of entries once traversal completes.
   */
  collect?: (headings: TocEntry[]) => void;
}

interface VFileLike {
  data?: FileDataWithHeadings;
}

export interface FileDataWithHeadings {
  [HEADING_METADATA_KEY]?: TocEntry[];
  [TOC_DATA_KEY]?: TocEntry[];
  [key: string]: unknown;
}

type HeadingData = Data & {
  hProperties?: Record<string, unknown>;
  id?: string;
};

type HeadingProperties = Record<string, unknown> & {
  id?: string;
  tabIndex?: number;
  style?: string | Record<string, unknown>;
};

const DEFAULT_MIN_DEPTH = 2;
const DEFAULT_MAX_DEPTH = 6;

const cloneEntries = (entries: TocEntry[]): TocEntry[] => entries.map((entry) => ({ ...entry }));

const traverseAst = (node: Root | Content, visitor: (heading: Heading) => void) => {
  if (!node || typeof node !== 'object') {
    return;
  }

  if ((node as { type?: string }).type === 'heading') {
    visitor(node as Heading);
  }

  if ('children' in node && Array.isArray((node as Root | Content).children)) {
    for (const child of (node as Root | Content).children as Content[]) {
      traverseAst(child, visitor);
    }
  }
};

const extractText = (node: Heading): string => {
  const values: string[] = [];

  const stack: (Heading | Content)[] = [node];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    if ('value' in current && typeof (current as Content & { value?: unknown }).value === 'string') {
      values.push(String((current as Content & { value?: unknown }).value));
    }

    if ('alt' in current && typeof (current as Content & { alt?: unknown }).alt === 'string') {
      values.push(String((current as Content & { alt?: unknown }).alt));
    }

    if ('title' in current && typeof (current as Content & { title?: unknown }).title === 'string') {
      values.push(String((current as Content & { title?: unknown }).title));
    }

    if ('children' in current && Array.isArray((current as Heading | Content).children)) {
      for (const child of (current as Heading | Content).children as Content[]) {
        stack.push(child);
      }
    }
  }

  return values
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeValue = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const sanitize = (value: string): string =>
  normalizeValue(value)
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const slugify = (value: string): string => {
  const slug = sanitize(value);
  return slug.length > 0 ? slug : 'section';
};

const createSlugger = () => {
  const occurrences = new Map<string, number>();

  const register = (value: string): string => {
    const base = slugify(value);
    const count = occurrences.get(base) ?? 0;
    occurrences.set(base, count + 1);
    return base;
  };

  return {
    slug: (value: string) => {
      const base = register(value);
      const count = occurrences.get(base)!;
      return count === 1 ? base : `${base}-${count - 1}`;
    },
    register,
  };
};

const ensureScrollMargin = (properties: HeadingProperties) => {
  const margin = '6rem';
  const style = properties.style;

  if (typeof style === 'string' && style.length > 0) {
    if (!/scroll-margin-top/i.test(style)) {
      const separator = style.trim().endsWith(';') || style.trim().length === 0 ? '' : ';';
      properties.style = `${style}${separator}scroll-margin-top:${margin};`;
    }
    return;
  }

  if (style && typeof style === 'object') {
    const styleObject = style as Record<string, unknown>;
    if (!('scrollMarginTop' in styleObject)) {
      styleObject.scrollMarginTop = margin;
    }
    properties.style = styleObject;
    return;
  }

  properties.style = { scrollMarginTop: margin };
};

/**
 * Remark plugin that ensures deterministic heading IDs and captures metadata for the docs table of contents.
 */
export function headingIdPlugin(options: HeadingIdPluginOptions = {}) {
  const { minDepth = DEFAULT_MIN_DEPTH, maxDepth = DEFAULT_MAX_DEPTH, collect } = options;

  return (tree: Root, file: VFileLike) => {
    const slugger = createSlugger();
    const headings: TocEntry[] = [];

    if (!file.data) {
      file.data = {};
    }

    traverseAst(tree, (node: Heading) => {
      const text = extractText(node);
      if (!text) {
        return;
      }

      const data = (node.data ??= {} as HeadingData) as HeadingData;
      const properties = (data.hProperties ??= {}) as HeadingProperties;

      const existingId = typeof properties.id === 'string' && properties.id.trim().length > 0 ? properties.id.trim() : undefined;
      let slug: string;

      if (existingId) {
        slug = existingId;
        // Register the slug with the slugger so duplicate headings receive incremented suffixes.
        slugger.slug(slug);
      } else {
        slug = slugger.slug(text);
      }

      properties.id = slug;
      properties.tabIndex = -1;
      properties['data-heading-level'] = node.depth;
      ensureScrollMargin(properties);
      data.id = slug;

      const includeInToc = node.depth >= minDepth && node.depth <= maxDepth;
      if (includeInToc) {
        headings.push({
          id: slug,
          depth: node.depth,
          value: text,
          line: node.position?.start?.line ?? null,
        });
      }
    });

    const data = file.data as FileDataWithHeadings;
    data[HEADING_METADATA_KEY] = headings;
    data[TOC_DATA_KEY] = headings;

    if (collect) {
      collect(cloneEntries(headings));
    }
  };
}

export default headingIdPlugin;
