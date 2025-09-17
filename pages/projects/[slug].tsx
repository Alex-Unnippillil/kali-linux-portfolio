import fs from 'fs/promises';
import matter from 'gray-matter';
import type { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import path from 'path';
import { marked } from 'marked';

import { createProjectJsonLd, inferProjectSchemaType } from '../../lib/jsonld/project';
import type { ProjectFrontmatter } from '../../lib/jsonld/types';
import { getCspNonce } from '../../utils/csp';

interface ProjectPageProps {
  slug?: string;
  frontMatter?: ProjectFrontmatter;
  contentHtml?: string;
}

const PROJECTS_DIR = path.join(process.cwd(), 'projects');

export default function ProjectPage({ slug: initialSlug, frontMatter, contentHtml }: ProjectPageProps) {
  const router = useRouter();
  const slug = initialSlug ?? (typeof router.query.slug === 'string' ? router.query.slug : undefined);
  const fm = frontMatter ?? {};
  const jsonLd = createProjectJsonLd(fm, slug);
  const nonce = getCspNonce();
  const headline = fm.title ?? fm.headline ?? formatHeadline(slug);
  const description = fm.description ?? fm.summary ?? fm.excerpt;
  const schemaLabel = inferProjectSchemaType(fm) === 'Article' ? 'Article' : 'Software Project';
  const primaryImage = Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image;

  return (
    <>
      <Head>
        <title>{`${headline} | Projects | Alex Unnippillil`}</title>
        {description ? <meta name="description" content={description} /> : null}
        {primaryImage ? <meta property="og:image" content={primaryImage} /> : null}
        {jsonLd ? (
          <script
            type="application/ld+json"
            nonce={nonce}
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        ) : null}
      </Head>
      <main className="min-h-screen bg-[#0f1317] text-white">
        <article className="mx-auto max-w-3xl px-4 py-10 space-y-8">
          <header className="space-y-3">
            <p className="text-sm uppercase tracking-wide text-blue-300">{schemaLabel}</p>
            <h1 className="text-3xl font-semibold leading-tight">{headline}</h1>
            {description ? <p className="text-lg text-gray-300">{description}</p> : null}
            {(fm.datePublished || fm.dateModified) && (
              <dl className="flex flex-wrap gap-4 text-sm text-gray-400">
                {fm.datePublished ? (
                  <div>
                    <dt className="sr-only">Published</dt>
                    <dd>{`Published ${formatDate(fm.datePublished)}`}</dd>
                  </div>
                ) : null}
                {fm.dateModified ? (
                  <div>
                    <dt className="sr-only">Updated</dt>
                    <dd>{`Updated ${formatDate(fm.dateModified)}`}</dd>
                  </div>
                ) : null}
              </dl>
            )}
          </header>
          {contentHtml ? (
            <div
              className="space-y-4 leading-relaxed text-gray-200"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          ) : (
            <p className="text-gray-300">
              This project entry is coming soon. Check back later for the full write-up.
            </p>
          )}
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const files = await fs.readdir(PROJECTS_DIR);
    const paths = files
      .filter((file) => file.endsWith('.md') || file.endsWith('.mdx'))
      .map((file) => file.replace(/\.(md|mdx)$/i, ''))
      .map((slug) => ({ params: { slug } }));
    return { paths, fallback: 'blocking' };
  } catch {
    return { paths: [], fallback: 'blocking' };
  }
};

export const getStaticProps: GetStaticProps<ProjectPageProps> = async ({ params }) => {
  const slugParam = params?.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;
  if (!slug || typeof slug !== 'string') {
    return { notFound: true };
  }

  const filePath = await findProjectFile(slug);
  if (!filePath) {
    return { notFound: true };
  }

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);
    const frontMatter: ProjectFrontmatter = {
      ...(parsed.data as ProjectFrontmatter),
      slug,
    };
    if (!frontMatter.dateModified) {
      const stats = await fs.stat(filePath);
      frontMatter.dateModified = stats.mtime.toISOString();
    }
    const contentHtml = parsed.content ? (marked.parse(parsed.content) as string) : '';

    return {
      props: {
        slug,
        frontMatter,
        contentHtml,
      },
      revalidate: 60,
    };
  } catch {
    return { notFound: true };
  }
};

async function findProjectFile(slug: string): Promise<string | null> {
  const candidates = [`${slug}.mdx`, `${slug}.md`];
  for (const candidate of candidates) {
    const fullPath = path.join(PROJECTS_DIR, candidate);
    try {
      await fs.access(fullPath);
      return fullPath;
    } catch {
      // continue searching
    }
  }
  return null;
}

function formatHeadline(slug?: string): string {
  if (!slug) return 'Project';
  const normalized = slug.trim();
  if (!normalized) return 'Project';
  const parts = normalized
    .split(/[\/_-]+/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));
  return parts.length ? parts.join(' ') : 'Project';
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  try {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
  } catch {
    return value;
  }
}
