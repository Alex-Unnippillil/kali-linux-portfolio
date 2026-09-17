import ProjectCatalog from '../portfolio/ProjectCatalog';
import styles from '../portfolio/portfolio.module.css';
export default function ProjectGallery() {
  return <div className={styles.desktopCatalog}><h1 className={styles.pageTitle}>Projects &amp; engineering labs</h1><p className={styles.pageIntro}>Source-backed projects, architecture notes and clearly labeled forks.</p><ProjectCatalog /></div>;
}
