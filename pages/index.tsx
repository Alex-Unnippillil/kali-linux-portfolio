import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import Meta from '../components/SEO/Meta';

// The OS is the homepage. Keep its browser-only runtime off the server, not behind a landing page.
const Ubuntu = dynamic(() => import('../components/ubuntu'), {
  ssr: false,
  loading: () => <div role="status" className="flex h-screen items-center justify-center bg-ub-cool-grey text-white">Starting Kali desktop…</div>,
});
export default function Home() {
  const router = useRouter();
  const initialApp = typeof router.query.app === 'string' ? router.query.app : 'about';
  return <><Meta /><Ubuntu initialApp={initialApp} />
    <noscript><main className="bg-ub-cool-grey p-8 text-white"><h1>Alex Unnippillil — Kali Linux portfolio</h1><p>The interactive desktop needs JavaScript. Read the profile, projects and contact details without it.</p><nav aria-label="Portfolio documents"><Link prefetch={false} href="/about/">About Alex</Link> · <Link prefetch={false} href="/projects/">Projects</Link> · <Link prefetch={false} href="/contact/">Contact</Link></nav></main></noscript>
  </>;
}
