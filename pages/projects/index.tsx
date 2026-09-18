import Meta from '../../components/SEO/Meta';
import PortfolioFrame from '../../components/portfolio/PortfolioFrame';
import ProjectCatalog from '../../components/portfolio/ProjectCatalog';
import styles from '../../components/portfolio/portfolio.module.css';
export default function Projects() {
  return <><Meta title="Projects | Alex Unnippillil" description="Explore software, AI retrieval and security projects with source links, architecture notes and clearly labeled forks." path="/projects" />
    <PortfolioFrame active="projects" title="Projects / repository catalog"><p className={styles.eyebrow}>Source-backed work</p><h1 className={styles.pageTitle}>Projects &amp; engineering labs</h1><p className={styles.pageIntro}>What each project does, how it is built, and the tradeoffs behind it. Featured work and exploratory forks are kept separate.</p><ProjectCatalog /></PortfolioFrame></>;
}
