import dynamic from 'next/dynamic';

const MailSecurityMatrix = dynamic(() => import('../../apps/mail-security-matrix'), {
  ssr: false,
});

export default function MailSecurityMatrixPage() {
  return <MailSecurityMatrix />;
}
