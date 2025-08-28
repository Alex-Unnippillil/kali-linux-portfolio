import { useEffect, useState } from 'react';
const InstallButton = () => {
    const [prompt, setPrompt] = useState(null);
    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);
    const handleInstall = async () => {
        if (!prompt)
            return;
        prompt.prompt();
        await prompt.userChoice;
        setPrompt(null);
    };
    if (!prompt)
        return null;
    return (<button onClick={handleInstall} className="fixed bottom-4 right-4 bg-ubt-blue text-white px-3 py-1 rounded">
      Install
    </button>);
};
export default InstallButton;
