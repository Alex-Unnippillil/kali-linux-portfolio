import dynamic from 'next/dynamic';

const CookieJar = dynamic(() => import('../../apps/cookie-jar'), { ssr: false });

export default function CookieJarPage() {
  return <CookieJar />;
}

