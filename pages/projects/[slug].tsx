import type { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import Meta from '../../components/SEO/Meta';
import PortfolioFrame from '../../components/portfolio/PortfolioFrame';
import { projects, projectKind, type Project } from '../../lib/portfolio';
import styles from '../../components/portfolio/portfolio.module.css';
export default function ProjectPage({ project }: { project: Project }) {
  return <><Meta title={`${project.title} | Alex Unnippillil`} description={project.description} path={`/projects/${project.slug}`} />
    <PortfolioFrame projectSlug={project.slug} active="projects" title={`Projects / ${project.slug}`}><div className={styles.prose}>
      <Link href="/projects" prefetch={false}>← All projects</Link><p className={styles.eyebrow}>{projectKind(project)}</p>
      <h1 className={styles.pageTitle}>{project.title}</h1><p>{project.description}</p>
      {project.isFork && <p className={styles.notice}>This is an upstream fork, not an original project or a verified contribution.</p>}
      <div className={styles.tags}>{project.stack.map((tech) => <span key={tech}>{tech}</span>)}</div>
      <h2>Problem</h2><p>{project.problem}</p><h2>Architecture</h2><p>{project.architecture}</p><h2>Tradeoffs &amp; constraints</h2><p>{project.tradeoff}</p>
      <div className={styles.actions}><a className={styles.primary} href={project.repo} target="_blank" rel="noopener noreferrer">Repository (new tab)</a>{project.demo && <a className={styles.secondary} href={project.demo}>Open interactive demo</a>}</div>
      {project.metadata?.upstream && <p>Original project: <a href={project.metadata.upstream} target="_blank" rel="noopener noreferrer">upstream source (new tab)</a>.</p>}
      <p className={styles.provenance}>Architecture summary based on the <a href={project.source} target="_blank" rel="noopener noreferrer">repository documentation (new tab)</a>. Metadata verified {project.metadata?.verifiedAt ?? 'not yet'}; repository availability and functionality may change.</p>
    </div></PortfolioFrame></>;
}
export const getStaticPaths: GetStaticPaths = async () => ({ paths: projects.map(({ slug }) => ({ params: { slug } })), fallback: false });
export const getStaticProps: GetStaticProps = async ({ params }) => {
  const project = projects.find((item) => item.slug === params?.slug);
  return project ? { props: { project } } : { notFound: true };
};
