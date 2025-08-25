import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const CookieJar = dynamic(() => import('../../apps/cookie-jar'), {
  ssr: false,
});

export default function CookieJarPage() {
  return (
    <UbuntuWindow title="cookie jar">
      <CookieJar />
    </UbuntuWindow>
  );
}
