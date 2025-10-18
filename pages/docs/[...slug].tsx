import fs from 'fs';
import path from 'path';
import Head from 'next/head';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { MDXRemote, type MDXRemoteSerializeResult } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import matter from 'gray-matter';
import remarkGfm from 'remark-gfm';
import Slugger from 'github-slugger';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import type { Heading as MdastHeading, Root as MdastRoot } from 'mdast';
import type { Data as UnistData } from 'unist';

import DocLayout, {
  type DocFrontmatter,
  type DocNavGroup,
  type DocNavItem,
  type TableOfContentsItem,
} from '@/components/docs/DocLayout';

type DocPageProps = {
  frontmatter: DocFrontmatter;
  navGroups: DocNavGroup[];
  toc: TableOfContentsItem[];
  source: MDXRemoteSerializeResult;
};

const DOCS_DIRECTORY = path.join(process.cwd(), 'docs');
const SUPPORTED_EXTENSIONS = ['.mdx', '.md'];

interface DocMeta {
  slug: string[];
  title: string;
  description?: string;
  updated?: string;
  order?: number;
  groupKey: string;
  groupLabel: string;
}

type GrayMatterData = Record<string, unknown>;

function slugSegmentsFromRelativePath(relativePath: string) {
  return relativePath
    .replace(/\\/g, '/')
    .replace(/\.(mdx?|MDX?)$/, '')
    .split('/');
}

function titleFromSlug(slug: string) {
  const words = slug
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((value) => value.charAt(0).toUpperCase() + value.slice(1));
  return words.length > 0 ? words.join(' ') : slug;
}

function extractTitleFromContent(content: string) {
  const match = content.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : undefined;
}

function resolveStringField(data: GrayMatterData, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function resolveNumberField(data: GrayMatterData, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

async function getAllDocFiles() {
  const { default: fg } = await import('fast-glob');
  return fg(['**/*.mdx', '**/*.md'], { cwd: DOCS_DIRECTORY, onlyFiles: true }).then((files) =>
    files.sort((a, b) => a.localeCompare(b)),
  );
}

async function readDocMeta(relativePath: string): Promise<DocMeta> {
  const absolutePath = path.join(DOCS_DIRECTORY, relativePath);
  const file = await fs.promises.readFile(absolutePath, 'utf8');
  const { content, data } = matter(file);
  const slug = slugSegmentsFromRelativePath(relativePath);
  const frontmatter = data as GrayMatterData;
  const title =
    resolveStringField(frontmatter, ['title']) ?? extractTitleFromContent(content) ?? titleFromSlug(slug[slug.length - 1]);
  const description = resolveStringField(frontmatter, ['description', 'summary']);
  const updated = resolveStringField(frontmatter, ['updated', 'lastUpdated', 'last_updated']);
  const order = resolveNumberField(frontmatter, ['order', 'navOrder', 'nav_order', 'sidebar_position', 'position']);
  const groupKey = slug.length > 1 ? slug[0] : 'general';
  const groupLabel = slug.length > 1 ? titleFromSlug(slug[0]) : 'General';

  return {
    slug,
    title,
    description,
    updated,
    order,
    groupKey,
    groupLabel,
  };
}

async function getAllDocMetadata() {
  const files = await getAllDocFiles();
  return Promise.all(files.map((file) => readDocMeta(file)));
}

function isSameSlug(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((segment, index) => segment === b[index]);
}

function buildNavGroups(metas: DocMeta[], currentSlug: string[]): DocNavGroup[] {
  const grouped = new Map<
    string,
    {
      key: string;
      label: string;
      items: DocNavItem[];
    }
  >();

  metas.forEach((meta) => {
    const item: DocNavItem = {
      title: meta.title,
      href: `/docs/${meta.slug.join('/')}`,
      slug: meta.slug,
      group: meta.groupLabel,
      isActive: isSameSlug(meta.slug, currentSlug),
      order: meta.order,
    };

    const bucket = grouped.get(meta.groupKey);
    if (bucket) {
      bucket.items.push(item);
    } else {
      grouped.set(meta.groupKey, {
        key: meta.groupKey,
        label: meta.groupLabel,
        items: [item],
      });
    }
  });

  const sortByOrder = (a?: number, b?: number) => {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return a - b;
  };

  const sortedGroups = Array.from(grouped.values()).map((group) => ({
    key: group.key,
    label: group.label,
    items: group.items
      .slice()
      .sort((a, b) => sortByOrder(a.order, b.order) || a.title.localeCompare(b.title)),
  }));

  sortedGroups.sort((a, b) => {
    if (a.key === 'general' && b.key !== 'general') return -1;
    if (a.key !== 'general' && b.key === 'general') return 1;
    return a.label.localeCompare(b.label);
  });

  return sortedGroups.map(({ label, items }) => ({ label, items }));
}

function createHeadingCollector(headings: TableOfContentsItem[]) {
  return function headingCollector() {
    return (tree: MdastRoot) => {
      const slugger = new Slugger();
      visit(tree, 'heading', (node) => {
        const heading = node as MdastHeading & { data?: UnistData & { hProperties?: Record<string, unknown> } };
        const depth = heading.depth ?? 0;
        if (depth < 2 || depth > 4) {
          return;
        }

        const text = toString(heading).trim();
        if (!text) {
          return;
        }

        const id = slugger.slug(text);
        heading.data = heading.data ?? {};
        heading.data.hProperties = heading.data.hProperties ?? {};
        (heading.data.hProperties as Record<string, unknown>).id = id;
        (heading.data as Record<string, unknown>).id = id;

        headings.push({ id, title: text, depth });
      });
    };
  };
}

function findDocFile(slug: string[]): string {
  for (const extension of SUPPORTED_EXTENSIONS) {
    const candidate = path.join(DOCS_DIRECTORY, `${slug.join(path.sep)}${extension}`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(`Unable to locate documentation page for slug: ${slug.join('/')}`);
}

const mdxComponents = {};

export default function DocPage({ frontmatter, navGroups, toc, source }: DocPageProps) {
  const pageTitle = `${frontmatter.title} · Documentation`;
  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        {frontmatter.description ? <meta name="description" content={frontmatter.description} /> : null}
      </Head>
      <DocLayout frontmatter={frontmatter} navGroups={navGroups} toc={toc}>
        <MDXRemote {...source} components={mdxComponents} />
      </DocLayout>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const files = await getAllDocFiles();
  const paths = files.map((file) => ({
    params: {
      slug: slugSegmentsFromRelativePath(file),
    },
  }));

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<DocPageProps> = async ({ params }) => {
  const slugParam = params?.slug;
  const slug = Array.isArray(slugParam) ? slugParam : typeof slugParam === 'string' ? [slugParam] : [];
  if (slug.length === 0) {
    return {
      notFound: true,
    };
  }

  const filePath = findDocFile(slug);
  const file = await fs.promises.readFile(filePath, 'utf8');
  const { content, data } = matter(file);
  const headings: TableOfContentsItem[] = [];
  const mdxSource = await serialize(content, {
    mdxOptions: {
      remarkPlugins: [remarkGfm, createHeadingCollector(headings)],
    },
    scope: data,
  });

  const allDocsMeta = await getAllDocMetadata();
  const currentMeta = allDocsMeta.find((meta) => isSameSlug(meta.slug, slug));
  if (!currentMeta) {
    throw new Error(`Missing metadata for slug ${slug.join('/')}`);
  }

  const frontmatter: DocFrontmatter = {
    title: currentMeta.title,
    description: currentMeta.description,
    updated: currentMeta.updated,
  };

  const navGroups = buildNavGroups(allDocsMeta, slug);

  return {
    props: {
      frontmatter,
      navGroups,
      toc: headings,
      source: mdxSource,
    },
  };
};
