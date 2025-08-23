import React, { useState } from 'react';
import * as emlformat from 'eml-format';
import MsgReader from 'msgreader';

interface Attachment {
  filename: string;
  url: string;
}

interface ParsedMessage {
  name: string;
  headers: Record<string, any>;
  received: string[];
  attachments: Attachment[];
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
          emlformat.read(text, true, (err: any, data: any) => {
            if (err || !data) {
              parsed.push({
                name,
                headers: { Error: err?.message || 'Unable to parse' },
                received: [],
                attachments: [],
              });
            } else {
              const headers = data.headers || {};
              const received = ([] as string[]).concat(
                headers['received'] || headers['Received'] || []
              );
              const attachments = (data.attachments || []).map(
                (att: any, idx: number) => {
                  const base64 = att.data || att.content || '';
                  const type =
                    att.contentType || att.mimeType || 'application/octet-stream';
                  return {
                    filename: att.filename || `attachment-${idx}`,
                    url: `data:${type};base64,${base64}`,
                  } as Attachment;
                }
              );
              parsed.push({ name, headers, received, attachments });
            }
            resolve();
          });
        });
      } else if (name.toLowerCase().endsWith('.msg')) {
        const reader = new MsgReader(buffer);
        const data = reader.getFileData();
        const headers: Record<string, any> = data.headers || {};
        if (data.senderEmail) headers['sender'] = data.senderEmail;
        if (data.subject) headers['subject'] = data.subject;
        const received = ([] as string[]).concat(headers['received'] || []);
        const attachments = (data.attachments || []).map(
          (att: any, idx: number) => {
            const blob = new Blob([att.content], {
              type: att.mimeType || 'application/octet-stream',
            });
            return {
              filename: att.fileName || `attachment-${idx}`,
              url: URL.createObjectURL(blob),
            } as Attachment;
          }
        );
        parsed.push({ name, headers, received, attachments });
      } else {
        parsed.push({
          name,
          headers: { Error: 'Unsupported file type' },
          received: [],
          attachments: [],
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
          {Object.keys(msg.headers).length > 0 && (
            <table className="text-sm w-full mb-2 border-collapse">
              <tbody>
                {Object.entries(msg.headers).map(([k, v]) => (
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
          {msg.attachments.length > 0 && (
            <div>
              <h3 className="font-semibold">Attachments</h3>
              <ul className="list-disc list-inside text-sm">
                {msg.attachments.map((att, i) => (
                  <li key={i}>
                    <a
                      className="text-blue-400 underline"
                      href={att.url}
                      download={att.filename}
                    >
                      {att.filename}
                    </a>
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

