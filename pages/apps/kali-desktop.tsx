import dynamic from 'next/dynamic';

const KaliDesktop = dynamic(() => import('../../components/apps/kali-desktop'), {
  ssr: false,
});

export default KaliDesktop;

