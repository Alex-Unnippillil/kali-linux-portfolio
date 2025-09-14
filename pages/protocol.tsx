"use client";

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function ProtocolHandler() {
  const router = useRouter();
  const { url } = router.query;
  const [decoded, setDecoded] = useState<string>('');

  useEffect(() => {
    if (typeof url !== 'string') return;
    const decodedUrl = decodeURIComponent(url);
    setDecoded(decodedUrl);
    if (decodedUrl.startsWith('/')) {
      router.replace(decodedUrl);
    }
  }, [url, router]);

  if (!decoded) return null;

  if (decoded.startsWith('/')) {
    return null;
  }

  return (
    <div className="p-4">
      <p>
        <a href={decoded}>{decoded}</a>
      </p>
    </div>
  );
}

