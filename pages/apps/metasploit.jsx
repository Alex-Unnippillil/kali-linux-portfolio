import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const Metasploit = dynamic(() => import('../../apps/metasploit'), {
  ssr: false,
  loading: () => getAppSkeleton('metasploit', 'Metasploit'),
});

export default function MetasploitPage() {
  return <Metasploit />;
}
