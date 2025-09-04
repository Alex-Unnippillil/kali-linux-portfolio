'use client';

import { useEffect, useState } from 'react';

export default function RemovableDrive() {
  const [mounted, setMounted] = useState(
    typeof window !== 'undefined' ? (window as any).removableDriveMounted : false
  );

  useEffect(() => {
    const handler = () =>
      setMounted((window as any).removableDriveMounted ?? false);
    window.addEventListener('removable-drive-change', handler);
    return () => window.removeEventListener('removable-drive-change', handler);
  }, []);

  return (
    <div className="p-4 text-white">
      Removable drive is {mounted ? 'mounted' : 'unmounted'}.
    </div>
  );
}
