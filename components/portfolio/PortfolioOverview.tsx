import { useState } from 'react';
import Link from 'next/link';
import PortfolioFrame from './PortfolioFrame';
import { ProjectCard } from './ProjectCatalog';
import { featuredProjects } from '../../lib/portfolio';
import Icon from './Icon';
import styles from './portfolio.module.css';

export default function PortfolioOverview({ onEnterDesktop }: { onEnterDesktop?: (remember: boolean) => void }) {
  const [remember, setRemember] = useState(false);
  return (
    <PortfolioFrame>
      <section className={styles.hero} aria-labelledby="portfolio-title">
        <div>
          <p className={styles.eyebrow}>Software · AI retrieval · security</p>
          <h1 id="portfolio-title">Alex Unnippillil<span className={styles.cursor} aria-hidden="true">_</span></h1>
          <p className={styles.lead}>Interactive software.<br />Engineering you can explore.</p>
          <p className={styles.intro}>I build browser workspaces, search tools and security learning environments. Start with the projects—or step inside the Linux-style desktop that brings this portfolio to life.</p>
          <div className={styles.actions}><Link className={styles.primary} href="/projects" prefetch={false}><Icon name="projects" />Explore the work</Link>{onEnterDesktop ? <button type="button" className={styles.secondary} onClick={() => onEnterDesktop(remember)}><Icon name="terminal" />Enter the desktop</button> : <Link className={styles.secondary} href="/?desktop=1" prefetch={false}><Icon name="terminal" />Enter the desktop</Link>}</div>
          {onEnterDesktop && <label className={styles.remember}><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />Remember desktop mode on this device</label>}
        </div>
        <aside className={styles.systemNote} aria-label="How to explore this portfolio">
          <div className={styles.noteHeader}><Icon name="terminal" /><span>workspace / readme</span></div>
          <p><span className={styles.lineNumber}>01</span><strong>The work comes first.</strong><br /><span className={styles.noteText}>Read projects, architecture and tradeoffs without a boot screen.</span></p>
          <p><span className={styles.lineNumber}>02</span><strong>The desktop is the demo.</strong><br /><span className={styles.noteText}>Explore movable windows, the launcher, terminal and a catalog of apps.</span></p>
          <p><span className={styles.lineNumber}>03</span><strong>The labs stay safe.</strong><br /><span className={styles.noteText}>Security tools use educational fixtures, not live attacks.</span></p>
          <Link href="/about" prefetch={false}>About the engineer &amp; this environment <Icon name="arrow" width="16" height="16" /></Link>
        </aside>
      </section>
      <section aria-labelledby="featured-work"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Selected repositories</p><h2 id="featured-work">Featured work</h2></div><Link href="/projects" prefetch={false}>All projects <Icon name="arrow" width="16" height="16" /></Link></div><div className={styles.featuredGrid}>{featuredProjects.map((project) => <ProjectCard key={project.slug} project={project} compact />)}</div></section>
      <div className={styles.contactStrip}><p><strong>Let’s talk about what you’re building.</strong><span>Project questions, technical conversations and collaboration.</span></p><Link className={styles.secondary} href="/contact" prefetch={false}><Icon name="mail" />Get in touch</Link></div>
      <noscript><p className={styles.notice}>You can read the portfolio and follow project links without JavaScript. The interactive desktop needs JavaScript.</p></noscript>
    </PortfolioFrame>
  );
}
