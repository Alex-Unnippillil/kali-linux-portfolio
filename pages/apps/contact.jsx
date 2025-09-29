import dynamic from '@/utils/dynamic';

const ContactApp = dynamic(() => import('../../apps/contact'));

export default function ContactPage() {
  return <ContactApp />;
}
