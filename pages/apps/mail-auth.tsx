import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const MailAuth = dynamic(() => import('../../apps/mail-auth'), { ssr: false });

export default function MailAuthPage() {
  return (
    <UbuntuWindow title="mail auth">
      <MailAuth />
    </UbuntuWindow>
  );
}
