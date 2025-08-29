import dynamic from 'next/dynamic';

const AboutApp = dynamic(() => import('../../apps/about'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function AboutPage() {
  return <AboutApp />;
}
