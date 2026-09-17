import { useEffect, useRef, useState } from 'react';
import ProjectCatalog from '../portfolio/ProjectCatalog';
import ProjectDetails from '../portfolio/ProjectDetails';
import { projects, type Project } from '../../lib/portfolio';
import styles from '../portfolio/portfolio.module.css';
export default function ProjectGallery({ initialProject }: { initialProject?: string }) {
  const [selected, setSelected] = useState<Project | undefined>(() => projects.find((p) => p.slug === initialProject));
  const opener = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { setSelected(projects.find((p) => p.slug === initialProject)); }, [initialProject]);
  const select = (project: Project, button: HTMLButtonElement) => { opener.current = button; setSelected(project); };
  const back = () => { setSelected(undefined); requestAnimationFrame(() => opener.current?.focus({ preventScroll: true })); };
  return <div className={styles.desktopCatalog}>
    <div hidden={Boolean(selected)}><h1 className={styles.pageTitle}>Projects &amp; engineering labs</h1><p className={styles.pageIntro}>Source-backed projects, architecture notes and clearly labeled forks.</p><ProjectCatalog onSelect={select} /></div>
    {selected && <ProjectDetails project={selected} onBack={back} />}
  </div>;
}
