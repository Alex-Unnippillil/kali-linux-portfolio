import type { ReactNode } from 'react';
import Link from 'next/link';
import Icon, { type IconName } from './Icon';
import styles from './portfolio.module.css';

const navigation: { href: string; label: string; icon: IconName; key: string }[] = [
  { href: '/?overview=1', label: 'Overview', icon: 'terminal', key: 'overview' },
  { href: '/projects', label: 'Projects', icon: 'projects', key: 'projects' },
  { href: '/about', label: 'About Alex', icon: 'about', key: 'about' },
  { href: '/contact', label: 'Contact', icon: 'mail', key: 'contact' },
];
export default function PortfolioFrame({ children, active = 'overview', title = 'Portfolio overview' }: { children: ReactNode; active?: string; title?: string }) {
  return (
    <div className={styles.shell}>
      <a href="#portfolio-main" className={styles.skip}>Skip to portfolio content</a>
      <header className={styles.systemBar}><Link className={styles.brand} href="/?overview=1" prefetch={false}><Icon name="terminal" /><span>alex<span className={styles.host}>@portfolio</span></span></Link><span className={styles.sessionLabel}>Engineering workstation</span><Link className={styles.desktopLink} href="/?desktop=1" prefetch={false}>Open desktop <Icon name="arrow" width="16" height="16" /></Link></header>
      <div className={styles.workspace}>
        <nav className={styles.sidebar} aria-label="Portfolio navigation">{navigation.map((item) => <Link key={item.key} href={item.href} prefetch={false} aria-current={active === item.key ? 'page' : undefined}><Icon name={item.icon} /><span>{item.label}</span></Link>)}<a href="https://github.com/Alex-Unnippillil" target="_blank" rel="noopener noreferrer"><Icon name="code" /><span>GitHub<span className={styles.srOnly}> (new tab)</span></span></a></nav>
        <div className={styles.window}>
          <div className={styles.windowBar}><span className={styles.windowIcon}><Icon name="terminal" width="17" height="17" /></span><span>{title}</span><span className={styles.windowPath}>~/portfolio/{active}</span></div>
          <main id="portfolio-main" tabIndex={-1} className={styles.content}>{children}</main>
          <footer className={styles.statusBar}><span>Independent portfolio · not an official Kali Linux product</span><Link href="/about#safety" prefetch={false}>Security tools: simulations only</Link></footer>
        </div>
      </div>
    </div>
  );
}
