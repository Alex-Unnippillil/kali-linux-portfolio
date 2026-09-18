import { useEffect, useRef } from 'react';
import { projectKind, type Project } from '../../lib/portfolio';
import styles from './portfolio.module.css';
export default function ProjectDetails({ project, onBack }: { project: Project; onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [project.slug]);
  return <article className={styles.prose}>
    <button className={styles.secondary} type="button" onClick={onBack}>← Back to projects</button>
    <p className={styles.eyebrow}>{projectKind(project)}</p>
    <h1 ref={heading} tabIndex={-1} className={styles.pageTitle}>{project.title}</h1><p>{project.description}</p>
    {project.isFork && <p className={styles.notice}>An upstream fork, not an original project or a verified contribution.</p>}
    <div className={styles.tags}>{project.stack.map((tech) => <span key={tech}>{tech}</span>)}</div>
    <h2>Problem</h2><p>{project.problem}</p><h2>Architecture</h2><p>{project.architecture}</p><h2>Tradeoffs &amp; constraints</h2><p>{project.tradeoff}</p>
    <p><a href={project.repo} target="_blank" rel="noopener noreferrer">View repository (new tab)</a></p>
    {project.metadata?.upstream && <p><a href={project.metadata.upstream} target="_blank" rel="noopener noreferrer">Original upstream source (new tab)</a></p>}
    <p className={styles.provenance}>Based on the <a href={project.source} target="_blank" rel="noopener noreferrer">repository documentation (new tab)</a>. Metadata checked {project.metadata?.verifiedAt ?? 'not yet'}.</p>
  </article>;
}
