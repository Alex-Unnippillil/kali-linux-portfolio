import React, { useState } from 'react';
import * as emlformat from 'eml-format';
import MsgReader from 'msgreader';

function canonicalizeHeaders(headers: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(headers)) {
    const canonical = k
      .toLowerCase()
      .split('-')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join('-');
    out[canonical] = v;
  }
  return out;
}

async function decodeWorker(data: string, encoding: string) {
  return await new Promise<Uint8Array>((resolve, reject) => {
    const worker = new Worker(
      new URL('../../lib/emailDecoder.worker.ts', import.meta.url)
    );
    const id = Math.random().toString(36).slice(2);
    worker.onmessage = (e: MessageEvent<any>) => {
      if (e.data.id !== id) return;
      if (e.data.error) {
        reject(new Error(e.data.error));
      } else {
        resolve(new Uint8Array(e.data.decoded));
      }
      worker.terminate();
    };
    worker.postMessage({ id, data, encoding });
  });
}

function sanitizeHtml(html: string) {
  return html.replace(/<script.*?>[\s\S]*?<\/script>/gi, '');
}

interface Attachment {
  filename: string;
  url: string;
  type: string;
  preview?: string;
  error?: string;
}

interface ParsedMessage {
  name: string;
  headers: Record<string, any>;
  received: string[];
  attachments: Attachment[];
  body?: { type: 'text' | 'html'; content: string };
  error?: string;
}

export default function EmlMsgParser() {
  const [messages, setMessages] = useState<ParsedMessage[]>([]);

  const handleFiles = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);
    const parsed: ParsedMessage[] = [];

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const name = file.name;

      if (name.toLowerCase().endsWith('.eml')) {
        const text = new TextDecoder().decode(buffer);
        await new Promise<void>((resolve) => {
          emlformat.read(text, true, async (err: any, data: any) => {
            if (err || !data) {
              parsed.push({
                name,
                headers: { Error: err?.message || 'Unable to parse' },
                received: [],
                attachments: [],
                error: err?.message || 'Unable to parse',
              });
            } else {
              const headers = canonicalizeHeaders(data.headers || {});
              const received = ([] as string[]).concat(
                headers['Received'] || []
              );
              const attachments: Attachment[] = [];
              for (const [idx, att] of (data.attachments || []).entries()) {
                const base64 = att.data || att.content || '';
                const type =
                  att.contentType || att.mimeType || 'application/octet-stream';
                const encoding =
                  (att.encoding || att.transferEncoding || 'base64').toLowerCase();
                try {
                  const bytes = await decodeWorker(base64, encoding);
                  const blob = new Blob([bytes], { type });
                  const url = URL.createObjectURL(blob);
                  const preview = type.startsWith('text/')
                    ? new TextDecoder().decode(bytes.slice(0, 4096))
                    : undefined;
                  attachments.push({
                    filename: att.filename || `attachment-${idx}`,
                    url,
                    type,
                    preview,
                  });
                } catch (e: any) {
                  attachments.push({
                    filename: att.filename || `attachment-${idx}`,
                    url: '',
                    type,
                    error: e.message || 'Decode error',
                  });
                }
              }
              let body: ParsedMessage['body'];
              if (data.html) {
                body = { type: 'html', content: sanitizeHtml(data.html) };
              } else if (data.text) {
                body = { type: 'text', content: data.text };
              }
              parsed.push({ name, headers, received, attachments, body });
            }
            resolve();
          });
        });
      } else if (name.toLowerCase().endsWith('.msg')) {
        const reader = new MsgReader(buffer);
        const data = reader.getFileData();
        const headers: Record<string, any> = canonicalizeHeaders(
          data.headers || {}
        );
        if (data.senderEmail) headers['Sender'] = data.senderEmail;
        if (data.subject) headers['Subject'] = data.subject;
        const received = ([] as string[]).concat(headers['Received'] || []);
        const attachments: Attachment[] = [];
        for (const [idx, att] of (data.attachments || []).entries()) {
          try {
            const blob = new Blob([att.content], {
              type: att.mimeType || 'application/octet-stream',
            });
            const url = URL.createObjectURL(blob);
            let preview: string | undefined;
            if ((att.mimeType || '').startsWith('text/')) {
              preview = new TextDecoder().decode(att.content.slice(0, 4096));
            }
            attachments.push({
              filename: att.fileName || `attachment-${idx}`,
              url,
              type: att.mimeType || 'application/octet-stream',
              preview,
            });
          } catch (e: any) {
            attachments.push({
              filename: att.fileName || `attachment-${idx}`,
              url: '',
              type: att.mimeType || 'application/octet-stream',
              error: e.message || 'Decode error',
            });
          }
        }
        let body: ParsedMessage['body'];
        if (data.body) {
          body = { type: 'text', content: data.body };
        }
        parsed.push({ name, headers, received, attachments, body });
      } else {
        parsed.push({
          name,
          headers: { Error: 'Unsupported file type' },
          received: [],
          attachments: [],
          error: 'Unsupported file type',
        });
      }
    }

    setMessages(parsed);
  };

  return (
    <div className="p-4 h-full w-full overflow-auto bg-panel text-white space-y-4">
      <input
        type="file"
        multiple
        accept=".eml,.msg"
        onChange={handleFiles}
        className="mb-4"
      />
      {messages.map((msg, idx) => (
        <div key={idx} className="border border-gray-700 rounded p-2">
          <h2 className="font-bold mb-2">{msg.name}</h2>
          {msg.error && (
            <div className="text-red-400 text-sm mb-2">{msg.error}</div>
          )}
          {Object.keys(msg.headers).length > 0 && (
            <table className="text-sm w-full mb-2 border-collapse">
              <tbody>
                {Object.entries(msg.headers)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([k, v]) => (
                    <tr key={k} className="border-t border-gray-700">
                      <td className="p-1 font-semibold align-top">{k}</td>
                      <td className="p-1 break-all">
                        {Array.isArray(v) ? v.join('; ') : v}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
          {msg.received.length > 0 && (
            <div className="mb-2">
              <h3 className="font-semibold">Received Timeline</h3>
              <ol className="list-decimal list-inside text-sm">
                {msg.received.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
            </div>
          )}
          {msg.body && (
            <div className="mb-2">
              <h3 className="font-semibold">Body</h3>
              {msg.body.type === 'html' ? (
                <iframe
                  className="w-full border border-gray-700"
                  sandbox=""
                  srcDoc={msg.body.content}
                />
              ) : (
                <pre className="whitespace-pre-wrap break-all text-sm">
                  {msg.body.content}
                </pre>
              )}
            </div>
          )}
          {msg.attachments.length > 0 && (
            <div>
              <h3 className="font-semibold">Attachments</h3>
              <ul className="list-disc list-inside text-sm space-y-2">
                {msg.attachments.map((att, i) => (
                  <li key={i}>
                    {att.error ? (
                      <span className="text-red-400">
                        {att.filename} - {att.error}
                      </span>
                    ) : (
                      <div className="space-y-1">
                        {att.type.startsWith('image/') && (
                          <img
                            src={att.url}
                            alt={att.filename}
                            className="max-w-xs max-h-64"
                          />
                        )}
                        {att.preview && (
                          <pre className="whitespace-pre-wrap break-all max-h-64 overflow-auto border border-gray-700 p-1">
                            {att.preview}
                          </pre>
                        )}
                        <a
                          className="text-blue-400 underline"
                          href={att.url}
                          download={att.filename}
                          rel="noopener noreferrer"
                        >
                          {att.filename}
                        </a>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

