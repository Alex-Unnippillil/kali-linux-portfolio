'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProtocolPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const param = search.get('url');
    if (!param) return;

    try {
      const decoded = decodeURIComponent(param);
      setTarget(decoded);
      if (decoded.startsWith('/')) {
        router.replace(decoded);
      }
    } catch {
      setTarget(param);
    }
  }, [router, search]);

  if (target && target.startsWith('/')) {
    return null;
  }

  return (
    <div className="p-4">
      {target ? (
        <a href={target} className="underline text-blue-500">
          {target}
        </a>
      ) : (
        <p>No URL provided</p>
      )}
    </div>
  );
}

