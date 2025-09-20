import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const ContactApp = dynamic(() => import('../../apps/contact'), {
  ssr: false,
  loading: () => getAppSkeleton('contact', 'Contact'),
});

export default function ContactPage() {
  return <ContactApp />;
}
