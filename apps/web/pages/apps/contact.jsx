import dynamic from 'next/dynamic';

const ContactApp = dynamic(() => import('../../apps/contact'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function ContactPage() {
  return <ContactApp />;
}
