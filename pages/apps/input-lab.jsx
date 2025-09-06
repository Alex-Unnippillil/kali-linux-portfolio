import dynamic from 'next/dynamic';

const InputLab = dynamic(() => import('../../apps/input-lab'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function InputLabPage() {
  return <InputLab />;
}
