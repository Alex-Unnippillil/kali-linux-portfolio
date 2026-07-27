import dynamic from 'next/dynamic';
import AppFrame from '../../components/apps/AppFrame';
import { AppLoadingState } from '../../components/apps/AppLoading';

const ContactApp = dynamic(() => import('../../apps/contact'), {
  ssr: false,
  loading: () => (
    <AppLoadingState
      title="Loading contact form"
      description="Preparing fields and spam protection."
    />
  ),
});

export default function ContactPage() {
  return (
    <AppFrame
      title="Contact"
      icon="/themes/Yaru/apps/contact.svg"
      description="A desktop-style contact form that keeps messages local in this demo."
      helpTitle="What this contact demo is (and is not)"
      helpContent={
        <ul className="list-disc space-y-2 pl-4 text-sm text-slate-200">
          <li>Use it to try the interface—messages stay in your browser for privacy during demos.</li>
          <li>Enable real delivery only if you supply credentials in your own deployment.</li>
          <li>No analytics or third-party calls are triggered while you experiment here.</li>
        </ul>
      }
      shortcuts={[
        { keys: 'Tab', description: 'Navigate through input fields and buttons' },
        { keys: 'Shift + Enter', description: 'Insert a line break in the message body' },
      ]}
    >
      <ContactApp />
    </AppFrame>
  );
}
