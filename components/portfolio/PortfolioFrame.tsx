import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import styles from './portfolio.module.css';

const Ubuntu = dynamic(() => import('../ubuntu'), {
  ssr: false,
  loading: () => <div role="status" className="flex h-screen items-center justify-center bg-ub-cool-grey text-white">Opening desktop application…</div>,
});
export default function PortfolioFrame({ children, active = 'about', title = 'Portfolio', projectSlug }: { children: ReactNode; active?: string; title?: string; projectSlug?: string }) {
  const appId = active === 'projects' ? 'project-gallery' : active === 'contact' ? 'contact' : 'about';
  const context = useMemo(() => projectSlug ? { projectSlug } : undefined, [projectSlug]);
  return <><Ubuntu initialApp={appId} initialContext={context} />
    <noscript><div className={styles.shell}><nav aria-label="Portfolio documents"><Link prefetch={false} href="/">Desktop</Link> · <Link prefetch={false} href="/about/">About Alex</Link> · <Link prefetch={false} href="/projects/">Projects</Link> · <Link prefetch={false} href="/contact/">Contact</Link></nav><main id="portfolio-main" aria-label={title} className={styles.content}>{children}</main></div></noscript>
  </>;
}
