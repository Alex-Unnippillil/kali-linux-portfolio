import { useEffect, useState } from 'react';

interface StatusData {
  status: string;
  logs: string[];
}

export default function KaliBuilderPage() {
  const [status, setStatus] = useState('PENDING');
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const es = new EventSource('/api/kali-builder/status?id=demo');
    es.onmessage = (evt) => {
      const data: StatusData = JSON.parse(evt.data);
      setStatus(data.status);
      setLogs(data.logs);
    };
    return () => es.close();
  }, []);

  return (
    <div className="p-4 text-xs space-y-2">
      <p>Status: {status}</p>
      <pre className="bg-black text-green-400 p-2 h-64 overflow-auto" aria-label="build logs">
        {logs.join('\n')}
      </pre>
    </div>
  );
}

