import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import TerminalSection from '../../components/mdx/TerminalSection';

interface ProjectPageProps {
  source: MDXRemoteSerializeResult;
  frontMatter: { [key: string]: any };
}

const components = {
  Terminal: TerminalSection,
};

export default function ProjectPage({ source, frontMatter }: ProjectPageProps) {
  return (
    <article className="prose prose-invert max-w-none">
      <h1>{frontMatter.title}</h1>
      <MDXRemote {...source} components={components} />
    </article>
  );
}

export async function getStaticPaths() {
  const projectsDir = path.join(process.cwd(), 'content/projects');
  const files = fs.readdirSync(projectsDir);
  const paths = files.map((file) => ({ params: { slug: file.replace(/\.mdx?$/, '') } }));
  return { paths, fallback: false };
}

export async function getStaticProps({ params }: { params: { slug: string } }) {
  const projectsDir = path.join(process.cwd(), 'content/projects');
  const filePath = path.join(projectsDir, `${params.slug}.mdx`);
  const source = fs.readFileSync(filePath, 'utf8');
  const { content, data } = matter(source);
  const mdxSource = await serialize(content, { scope: data });
  return { props: { source: mdxSource, frontMatter: data } };
}
