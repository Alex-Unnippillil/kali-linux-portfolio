import dynamic from 'next/dynamic';

const MailAuth = dynamic(() => import('../../apps/mail-auth'), { ssr: false });

export default function MailAuthPage() {
  return <MailAuth />;
}
