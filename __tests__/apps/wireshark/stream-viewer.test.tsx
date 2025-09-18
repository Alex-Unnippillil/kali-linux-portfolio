import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import StreamViewer from '../../../apps/wireshark/components/StreamViewer';
import {
  useTcpStreams,
  type PacketSummary,
} from '../../../components/apps/wireshark/utils';

const buildTcpFrame = (
  srcIp: string,
  destIp: string,
  srcPort: number,
  destPort: number,
  payload: string
): Uint8Array => {
  const payloadBytes = new TextEncoder().encode(payload);
  const frame = new Uint8Array(54 + payloadBytes.length);
  frame[12] = 0x08;
  frame[13] = 0x00;
  frame[14] = 0x45;
  frame[23] = 6;
  const srcParts = srcIp.split('.').map(Number);
  const destParts = destIp.split('.').map(Number);
  frame.set(srcParts, 26);
  frame.set(destParts, 30);
  frame[34] = (srcPort >> 8) & 0xff;
  frame[35] = srcPort & 0xff;
  frame[36] = (destPort >> 8) & 0xff;
  frame[37] = destPort & 0xff;
  frame[46] = 0x50;
  frame.set(payloadBytes, 54);
  return frame;
};

const createPacket = ({
  timestamp,
  src,
  dest,
  sport,
  dport,
  payload,
}: {
  timestamp: string;
  src: string;
  dest: string;
  sport: number;
  dport: number;
  payload: string;
}): PacketSummary => ({
  timestamp,
  src,
  dest,
  protocol: 6,
  info: `TCP ${sport} → ${dport}`,
  sport,
  dport,
  data: buildTcpFrame(src, dest, sport, dport, payload),
});

const ConversationHarness: React.FC<{
  packets: PacketSummary[];
  focusIndex?: number;
}> = ({ packets, focusIndex = 0 }) => {
  const { streams } = useTcpStreams(packets);
  const stream = streams[0] ?? null;
  const focusPacket = packets[focusIndex] ?? null;
  return <StreamViewer stream={stream} focusPacket={focusPacket} />;
};

describe('StreamViewer', () => {
  it('renders grouped TCP dialogue with ASCII payloads', () => {
    const packets = [
      createPacket({
        timestamp: '1.000000',
        src: '192.168.0.10',
        dest: '192.168.0.20',
        sport: 4321,
        dport: 80,
        payload: 'GET / HTTP/1.1\nHost: example\n\n',
      }),
      createPacket({
        timestamp: '1.120000',
        src: '192.168.0.20',
        dest: '192.168.0.10',
        sport: 80,
        dport: 4321,
        payload: 'HTTP/1.1 200 OK\nContent-Length: 0\n\n',
      }),
    ];

    render(<ConversationHarness packets={packets} focusIndex={0} />);

    expect(
      screen.getByText(/#1 192\.168\.0\.10:4321 → 192\.168\.0\.20:80/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/#2 192\.168\.0\.20:80 → 192\.168\.0\.10:4321/)
    ).toBeInTheDocument();
    expect(screen.getByText(/GET \/ HTTP\/1\.1/)).toBeInTheDocument();
    expect(screen.getByText(/HTTP\/1\.1 200 OK/)).toBeInTheDocument();

    const highlighted = screen.getByText(/GET \/ HTTP\/1\.1/).closest('.border');
    expect(highlighted).toHaveClass('ring-1');
  });

  it('exports the ordered dialogue as a text file', async () => {
    const packets = [
      createPacket({
        timestamp: '1.000000',
        src: '10.0.0.1',
        dest: '10.0.0.2',
        sport: 5150,
        dport: 443,
        payload: 'hello\n',
      }),
      createPacket({
        timestamp: '1.050000',
        src: '10.0.0.2',
        dest: '10.0.0.1',
        sport: 443,
        dport: 5150,
        payload: 'world\n',
      }),
    ];

    const originalCreate = (URL as any).createObjectURL;
    const originalRevoke = (URL as any).revokeObjectURL;
    const createSpy = jest.fn(() => 'blob:mock');
    const revokeSpy = jest.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createSpy,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeSpy,
    });
    const clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    render(<ConversationHarness packets={packets} focusIndex={1} />);

    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    expect(createSpy).toHaveBeenCalledTimes(1);
    const blob = createSpy.mock.calls[0][0] as Blob;
    const expectedExport = [
      `[1] 1.000000 10.0.0.1:5150 → 10.0.0.2:443\nhello\n`,
      `[2] 1.050000 10.0.0.2:443 → 10.0.0.1:5150\nworld\n`,
    ].join('\n\n');
    const expectedBytes = new TextEncoder().encode(expectedExport);
    expect(blob.size).toBe(expectedBytes.length);
    expect(blob.type).toBe('text/plain;charset=utf-8');
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock');
    const anchorInstance = clickSpy.mock.instances[0];
    expect(anchorInstance.download).toMatch(/tcp-stream/);

    clickSpy.mockRestore();
    if (originalCreate !== undefined) {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: originalCreate,
      });
    } else {
      Reflect.deleteProperty(URL, 'createObjectURL');
    }
    if (originalRevoke !== undefined) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        writable: true,
        value: originalRevoke,
      });
    } else {
      Reflect.deleteProperty(URL, 'revokeObjectURL');
    }
  });
});
