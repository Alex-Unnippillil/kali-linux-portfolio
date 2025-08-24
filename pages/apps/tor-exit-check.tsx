import dynamic from 'next/dynamic';

const TorExitCheck = dynamic(() => import('../../components/apps/tor-exit-check'), {
  ssr: false,
});

export default function TorExitCheckPage() {
  return <TorExitCheck />;
}
