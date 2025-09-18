import dynamic from 'next/dynamic';

const XssPlayground = dynamic(() => import('../../apps/xss-playground'), { ssr: false });

export default function XssPlaygroundPage() {
  return <XssPlayground />;
}
