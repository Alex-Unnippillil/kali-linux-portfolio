import Link from 'next/link';
import Meta from '../components/SEO/Meta';
import PortfolioFrame from '../components/portfolio/PortfolioFrame';
import styles from '../components/portfolio/portfolio.module.css';
export default function About() {
  return <><Meta title="About Alex Unnippillil | Engineering Portfolio" description="The engineering behind Alex Unnippillil’s browser workstation, retrieval tools and security learning environments." path="/about" />
    <PortfolioFrame active="about" title="About Alex / README"><div className={styles.prose}>
      <p className={styles.eyebrow}>About the engineer</p><h1 className={styles.pageTitle}>Alex Unnippillil</h1>
      <p>I build interactive software and explore how systems fit together: browser interfaces, search and retrieval, automation, and security learning tools.</p>
      <p>This portfolio is itself a systems project. Its desktop brings together window management, persistence, application discovery, accessibility, and a broad collection of browser-based applications.</p>
      <h2>Engineering areas</h2><p>The featured repositories show work in TypeScript and React interfaces, HTTP and browser crawling, Python retrieval pipelines, and PowerShell administration tooling. Each project links to its source and explains its architecture and tradeoffs.</p>
      <div className={styles.actions}><Link className={styles.primary} href="/projects" prefetch={false}>Explore the projects</Link><Link className={styles.secondary} href="/contact" prefetch={false}>Contact Alex</Link></div>
      <h2>Why a Linux desktop?</h2><p>It makes the interface itself something you can inspect and use. Open applications, move windows, search the launcher, or use the terminal. The reading routes provide the same project information without requiring desktop interaction.</p>
      <p>Inside the desktop, use the launcher to find applications and Ctrl/Cmd+K for the existing command palette. On a small screen, these reading routes provide a direct, touch-friendly way to explore the work.</p>
      <h2 id="safety">A safe, independent learning environment</h2><p>Security applications demonstrate concepts using fixtures and local data. They are not a way to attack targets, recover credentials, or intercept a network. This is an independent portfolio, not an official Kali Linux product.</p>
      <h2>Project provenance</h2><p>Repository metadata is checked and committed, not fetched on each page view. A fork is labeled as a fork; it is not evidence of original authorship or an accepted upstream contribution. No unverified employment, certification, impact metrics, or live repository statistics are added here.</p>
    </div></PortfolioFrame></>;
}
