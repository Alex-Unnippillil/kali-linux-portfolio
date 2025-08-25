import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const MailSecurityMatrix = dynamic(
  () => import('../../apps/mail-security-matrix'),
  { ssr: false }
);

export default function MailSecurityMatrixPage() {
  return (
    <UbuntuWindow title="mail security matrix">
      <MailSecurityMatrix />
    </UbuntuWindow>
  );
}
