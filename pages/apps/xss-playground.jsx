import dynamic from 'next/dynamic';

const XssPlayground = dynamic(() => import('../../apps/xss-playground'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function XssPlaygroundPage() {
  return <XssPlayground />;
}
