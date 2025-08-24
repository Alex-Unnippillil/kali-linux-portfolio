import dynamic from 'next/dynamic';

const Http3Probe = dynamic(() => import('../../apps/http3-probe'), {
  ssr: false,
});

export default function Http3ProbePage() {
  return <Http3Probe />;
}
