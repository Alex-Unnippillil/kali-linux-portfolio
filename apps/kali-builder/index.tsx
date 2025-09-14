import { useRouter } from 'next/router';
import { useState } from 'react';

export default function KaliBuilderApp() {
  const router = useRouter();
  const job = Array.isArray(router.query.job)
    ? router.query.job[0]
    : router.query.job;
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!job) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/kali-builder/download?job=${job}`);
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 bg-ub-grey text-white">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="px-3 py-1 bg-green-600 rounded text-black disabled:opacity-50"
      >
        Download
      </button>
    </div>
  );
}
