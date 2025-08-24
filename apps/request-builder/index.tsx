import React, { useEffect, useState } from 'react';
import type { RequestResponse } from '@/types/request';

interface HistoryEntry {
  method: string;
  url: string;
  headers: string;
  body: string;
}

interface RequestBuilderProps {}

const STORAGE_KEY = 'request-builder-history';

const RequestBuilder: React.FC<RequestBuilderProps> = () => {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState('{}');
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<RequestResponse | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          setHistory(JSON.parse(saved));
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const sendRequest = async () => {
    let parsedHeaders: Record<string, string> = {};
    if (headers.trim()) {
      try {
        parsedHeaders = JSON.parse(headers);
      } catch {
        alert('Invalid headers JSON');
        return;
      }
    }

    const res = await fetch('/api/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, url, headers: parsedHeaders, body }),
    });
    const data = (await res.json()) as RequestResponse;
    setResponse(data);
  };

  const saveCurrent = () => {
    const entry: HistoryEntry = { method, url, headers, body };
    const newHistory = [entry, ...history];
    setHistory(newHistory);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    }
  };

  const loadHistory = (index: number) => {
    const item = history[index];
    if (item) {
      setMethod(item.method);
      setUrl(item.url);
      setHeaders(item.headers);
      setBody(item.body);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex space-x-2">
        <select
          className="border p-1"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          className="flex-1 border p-1"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-2"
          onClick={sendRequest}
        >
          Send
        </button>
        <button
          className="bg-gray-600 text-white px-2"
          onClick={saveCurrent}
        >
          Save
        </button>
      </div>
      {history.length > 0 && (
        <div>
          <select
            className="border p-1"
            onChange={(e) =>
              e.target.value !== '' && loadHistory(parseInt(e.target.value, 10))
            }
          >
            <option value="">History...</option>
            {history.map((h, i) => (
              <option key={i} value={i}>{`${h.method} ${h.url}`}</option>
            ))}
          </select>
        </div>
      )}
      <textarea
        className="w-full border p-1"
        rows={4}
        placeholder='{"Content-Type":"application/json"}'
        value={headers}
        onChange={(e) => setHeaders(e.target.value)}
      />
      <textarea
        className="w-full border p-1"
        rows={4}
        placeholder="Request body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {response && (
        <div className="border p-2 space-y-2">
          <div>
            <strong>Duration:</strong> {response.duration} ms
          </div>
          <div>
            <strong>Status:</strong> {response.status} {response.statusText || ''}
          </div>
          <div>
            <strong>Headers:</strong>
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(response.headers, null, 2)}
            </pre>
          </div>
          <div>
            <strong>Body:</strong>
            <pre className="whitespace-pre-wrap">{response.body}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestBuilder;

