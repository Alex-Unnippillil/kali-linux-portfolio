import { useEffect } from 'react';

const KaliDesktopPage = () => {
  useEffect(() => {
    let active = true;
    fetch('/api/kasm/launch', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (active && data?.url) {
          window.location.href = data.url;
        }
      })
      .catch(() => {
        // ignore errors
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
      Launching Kali Desktop...
    </div>
  );
};

export default KaliDesktopPage;
