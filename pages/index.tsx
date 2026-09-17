import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import Meta from '../components/SEO/Meta';
import PortfolioOverview from '../components/portfolio/PortfolioOverview';
import { prefersDesktop, rememberDesktop } from '../lib/portfolio-preferences';
import styles from '../components/portfolio/portfolio.module.css';

// The desktop and its application registry are not part of the reading experience.
const Ubuntu = dynamic(() => import('../components/ubuntu'), {
  ssr: false,
  loading: () => <div role="status" className={styles.desktopLoading}>Opening the engineering workstation…</div>,
});
export default function Home() {
  const router = useRouter();
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    if (!router.isReady) return;
    setDesktop(router.query.overview === '1' ? false : router.query.desktop === '1' || prefersDesktop());
  }, [router.isReady, router.query.desktop, router.query.overview]);
  const enter = (remember: boolean) => {
    rememberDesktop(remember);
    setDesktop(true);
    void router.replace('/?desktop=1', undefined, { shallow: true }).catch(() => undefined);
  };
  const leave = () => {
    rememberDesktop(false);
    setDesktop(false);
    void router.replace('/?overview=1', undefined, { shallow: true }).catch(() => undefined);
  };
  return <><Meta />{desktop ? <>
    <Ubuntu />
    <button className={styles.desktopExit} type="button" onClick={leave}>Portfolio overview</button>
  </> : <PortfolioOverview onEnterDesktop={enter} />}</>;
}
