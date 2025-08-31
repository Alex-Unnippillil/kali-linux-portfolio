import dynamic from '@/utils/dynamic';

const ContactApp = dynamic(() => import('@/apps/contact'), {
  ssr: false,
});

export default function ContactPage() {
  return <ContactApp />;
}
