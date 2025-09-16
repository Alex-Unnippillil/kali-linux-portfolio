import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/contact');

const ContactApp = dynamic(() => import('../../apps/contact'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function ContactPage() {
  return <ContactApp />;
}
