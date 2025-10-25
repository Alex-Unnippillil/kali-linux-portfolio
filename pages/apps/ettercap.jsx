import dynamic from 'next/dynamic';

const EttercapApp = dynamic(() => import('../../apps/ettercap'), {
  ssr: false,
  loading: () => (
    <div className="p-6 text-sm text-[color:color-mix(in_srgb,var(--color-primary)_70%,var(--kali-text))]">
      Loading Ettercap lab...
    </div>
  ),
});

export default function EttercapPage() {
  return <EttercapApp />;
}
