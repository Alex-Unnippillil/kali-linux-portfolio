import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function KaliBuilderPage() {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : '';
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    const es = new EventSource(`/api/kali-builder/status?id=${id}`);
    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStatus(data.status);
      setLogs(data.logs);
      if (['SUCCEEDED', 'FAILED', 'FAULT', 'STOPPED'].includes(data.status)) {
        es.close();
      }
    };
    return () => es.close();
  }, [id]);

  return (
    <div>
      <h1 className="text-xl font-bold">Kali Builder</h1>
      <p data-testid="status">{status}</p>
      <pre data-testid="logs" className="whitespace-pre-wrap">{logs.join('\n')}</pre>
    </div>
  );
}

