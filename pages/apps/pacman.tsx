import dynamic from 'next/dynamic';

const Pacman = dynamic(() => import('../../apps/pacman'), { ssr: false });

export default function PacmanPage() {
  return <Pacman />;
}
