import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from 'next';
import Head from 'next/head';
import { promises as fs } from 'fs';
import path from 'path';
import { marked } from 'marked';
import { helpArticles } from '../../apps.config';

interface StaticArticleMeta {
  appId: string;
  title: string;
  docPath: string;
}

interface HelpArticleProps {
  article: {
    appId: string;
    title: string;
    html: string;
  };
}

const articles = helpArticles as unknown as Record<string, StaticArticleMeta>;

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = Object.keys(articles).map((appId) => ({
    params: { appId },
  }));
  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<HelpArticleProps> = async ({ params }) => {
  const appId = typeof params?.appId === 'string' ? params.appId : '';
  const meta = appId ? articles[appId] : undefined;

  if (!meta) {
    return { notFound: true };
  }

  const filePath = path.join(process.cwd(), 'public', meta.docPath.replace(/^\//, ''));

  try {
    const markdown = await fs.readFile(filePath, 'utf8');
    const parsed = await marked.parse(markdown);
    const html = typeof parsed === 'string' ? parsed : String(parsed);

    return {
      props: {
        article: {
          appId: meta.appId,
          title: meta.title,
          html,
        },
      },
    };
  } catch {
    return { notFound: true };
  }
};

type HelpArticlePageProps = InferGetStaticPropsType<typeof getStaticProps>;

const HelpArticlePage = ({ article }: HelpArticlePageProps) => {
  return (
    <>
      <Head>
        <title>{`${article.title} Help | Kali Linux Portfolio`}</title>
        <meta name="description" content={`Help article for the ${article.title} app.`} />
      </Head>
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <a href="/" className="text-sm text-blue-300 hover:underline">
            ← Back to desktop
          </a>
          <h1 className="mt-4 text-3xl font-bold">{article.title} Help</h1>
          <div
            className="prose prose-invert mt-6 max-w-none space-y-4 text-base leading-7"
            dangerouslySetInnerHTML={{ __html: article.html }}
          />
        </div>
      </main>
    </>
  );
};

export default HelpArticlePage;
