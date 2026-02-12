import React, { useCallback, useMemo } from 'react';
import type {
  PacketSummary,
  TcpDirection,
  TcpStream,
  TcpStreamMessage,
  TcpStreamParticipant,
} from '../../../components/apps/wireshark/utils';

interface StreamViewerProps {
  stream: TcpStream | null;
  focusPacket?: PacketSummary | null;
}

const directionStyles: Record<TcpDirection, string> = {
  forward: 'border-blue-500/60 bg-blue-900/40',
  reverse: 'border-purple-500/60 bg-purple-900/40',
};

const formatEndpoint = (participant?: TcpStreamParticipant | null) => {
  if (!participant) return 'Unknown';
  return participant.port !== undefined
    ? `${participant.address}:${participant.port}`
    : participant.address;
};

const formatEndpointFromMessage = (message: TcpStreamMessage) =>
  `${message.src}${
    message.sport !== undefined ? `:${message.sport}` : ''
  } → ${message.dest}${message.dport !== undefined ? `:${message.dport}` : ''}`;

const sanitizeForFilename = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'stream';

const StreamViewer: React.FC<StreamViewerProps> = ({ stream, focusPacket }) => {
  const exportText = useMemo(() => {
    if (!stream || stream.packets.length === 0) return '';
    return stream.packets
      .map((message, idx) => {
        const header = `[${idx + 1}] ${message.timestamp} ${formatEndpointFromMessage(
          message
        )}`;
        const payload = message.payload || '(no printable payload)';
        return `${header}\n${payload}`;
      })
      .join('\n\n');
  }, [stream]);

  const exportFileName = useMemo(() => {
    if (!stream) return 'tcp-stream.txt';
    const [a, b] = stream.participants;
    return `tcp-stream-${sanitizeForFilename(formatEndpoint(a))}-to-${sanitizeForFilename(
      formatEndpoint(b)
    )}.txt`;
  }, [stream]);

  const handleExport = useCallback(() => {
    if (!stream || !stream.packets.length || !exportText) return;
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = exportFileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [exportFileName, exportText, stream]);

  return (
    <div className="flex flex-col flex-shrink-0 w-80 min-w-[18rem] bg-black border border-gray-700 rounded text-xs font-mono">
      <div className="flex items-center justify-between px-2 py-1 border-b border-gray-700 text-[0.7rem] uppercase tracking-wide text-gray-300">
        <span>TCP Stream</span>
        <button
          type="button"
          onClick={handleExport}
          disabled={!stream || !stream.packets.length || !exportText}
          className={`px-2 py-1 rounded bg-gray-800 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          Export
        </button>
      </div>
      <div className="px-2 py-1 border-b border-gray-700 text-[0.7rem] text-gray-300">
        {stream
          ? `${formatEndpoint(stream.participants[0])} ↔ ${formatEndpoint(stream.participants[1])}`
          : 'Select a TCP packet to inspect the stream'}
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {stream && stream.packets.length ? (
          stream.packets.map((message, idx) => {
            const highlight = focusPacket && message.packet === focusPacket;
            return (
              <div
                key={message.index}
                className={`border rounded px-2 py-2 text-gray-100 whitespace-pre-wrap break-words ${
                  directionStyles[message.direction]
                } ${highlight ? 'ring-1 ring-white' : ''}`}
              >
                <div className="flex items-center justify-between text-[0.7rem] text-gray-300">
                  <span>
                    #{idx + 1} {formatEndpointFromMessage(message)}
                  </span>
                  <span>{message.timestamp}</span>
                </div>
                <pre className="mt-1 whitespace-pre-wrap break-words text-gray-100">
                  {message.payload || '⟂ No printable payload'}
                </pre>
              </div>
            );
          })
        ) : (
          <p className="text-gray-400 text-xs">
            Printable payloads will appear here once you select a TCP packet.
          </p>
        )}
      </div>
    </div>
  );
};

export default StreamViewer;
