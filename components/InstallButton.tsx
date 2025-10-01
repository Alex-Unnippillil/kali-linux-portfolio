import { useEffect, useState } from 'react';
import { track } from '@vercel/analytics';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

const InstallButton: React.FC = () => {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setPrompt(e);
    };
    (window as any).addEventListener('beforeinstallprompt', handler);
    return () => (window as any).removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    track('cta_click', { location: 'install_button' });
    setPrompt(null);
  };

  if (!prompt) return null;

  return (
    <button
      onClick={handleInstall}
      className="fixed bottom-4 right-4 bg-ubt-blue text-white px-3 py-1 rounded"
    >
      Install
    </button>
  );
};

export default InstallButton;
