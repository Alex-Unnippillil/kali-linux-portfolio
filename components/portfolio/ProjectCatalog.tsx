import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { projects, projectKind, type Project } from '../../lib/portfolio';
import Icon from './Icon';
import styles from './portfolio.module.css';

export function ProjectCard({ project, compact = false }: { project: Project; compact?: boolean }) {
  return (
    <article className={styles.projectCard}>
      <div className={styles.cardEyebrow}><Icon name={project.isFork ? 'code' : project.kind === 'lab' ? 'shield' : 'projects'} /><span>{project.category}</span></div>
      <h3><Link href={`/projects/${project.slug}`} prefetch={false}>{project.title}</Link></h3>
      <p>{project.description}</p>
      <div className={styles.tags} aria-label="Technologies">{project.stack.map((tech) => <span key={tech}>{tech}</span>)}</div>
      {!compact && <details className={styles.details}><summary>Architecture &amp; tradeoffs</summary><p>{project.architecture}</p><p>{project.tradeoff}</p></details>}
      <div className={styles.cardFooter}>
        <span>{projectKind(project)}</span>
        <a href={project.repo} target="_blank" rel="noopener noreferrer" aria-label={`${project.title} source on GitHub (opens a new tab)`}>Source <Icon name="arrow" width="15" height="15" /></a>
      </div>
      {project.isFork && project.metadata?.upstream && <a className={styles.upstream} href={project.metadata.upstream} target="_blank" rel="noopener noreferrer">Original upstream project (new tab)</a>}
      {project.metadata?.archived && <p className={styles.notice}>Archived repository</p>}
    </article>
  );
}

const filters = ['All work', 'Featured', 'Labs', 'Open source'] as const;
export default function ProjectCatalog() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof filters)[number]>('All work');
  const inputId = useId();
  const filtered = useMemo(() => projects.filter((p) => {
    const inGroup = filter === 'All work' || (filter === 'Featured' && p.featured) ||
      (filter === 'Labs' && p.kind === 'lab' && !p.isFork) || (filter === 'Open source' && p.isFork);
    return inGroup && `${p.title} ${p.description} ${p.category} ${p.stack.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase());
  }), [query, filter]);
  return (
    <section className={styles.catalog} aria-label="Project catalog">
      <div className={styles.catalogControls}>
        <div className={styles.search}><label htmlFor={inputId}>Find a project</label><div><Icon name="search" /><input id={inputId} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects, skills, or technology" /></div></div>
        <div className={styles.filters} role="group" aria-label="Filter projects">{filters.map((name) => <button type="button" key={name} aria-pressed={filter === name} onClick={() => setFilter(name)}>{name}</button>)}</div>
      </div>
      <p role="status" className={styles.resultCount}>{filtered.length} {filtered.length === 1 ? 'project' : 'projects'} shown. Forks are labeled separately.</p>
      <div className={styles.projectGrid}>{filtered.map((project) => <ProjectCard key={project.slug} project={project} />)}</div>
      {!filtered.length && <div className={styles.empty}><h3>No matching projects</h3><p>Try a project name or a technology such as Python.</p><button className={styles.secondary} type="button" onClick={() => { setQuery(''); setFilter('All work'); }}>Clear search and filters</button></div>}
      <p className={styles.provenance}>Repository metadata is a committed snapshot, checked on 17 September 2026. No live star counts or unverifiable impact metrics are displayed. <a href="https://github.com/Alex-Unnippillil?tab=repositories" target="_blank" rel="noopener noreferrer">Browse the wider GitHub catalog (new tab)</a>.</p>
    </section>
  );
}
