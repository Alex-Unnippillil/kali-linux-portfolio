import dynamic from 'next/dynamic';

const ThemeEditorApp = dynamic(() => import('../../apps/theme-editor'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function ThemeEditorPage() {
  return <ThemeEditorApp />;
}
