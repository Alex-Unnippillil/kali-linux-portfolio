import dynamic from 'next/dynamic';

const ContactApp = dynamic(() => import('../components/apps/contact'), { ssr: false });

export default function ContactPage() {
  return <ContactApp />;
}
