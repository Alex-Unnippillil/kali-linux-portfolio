import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PcapViewer from '../apps/wireshark/components/PcapViewer';

const encoder = new TextEncoder();

const createTcpPacket = (
  timestamp: string,
  src: string,
  sport: number,
  dest: string,
  dport: number,
  info: string,
  payload: string
) => ({
  timestamp,
  src,
  dest,
  protocol: 6,
  info,
  data: new Uint8Array(),
  sport,
  dport,
  payload: encoder.encode(payload),
});

describe('PcapViewer follow stream', () => {
  it('reconstructs stream messages in timestamp order', async () => {
    const packets = [
      createTcpPacket(
        '1.000000',
        '10.0.0.1',
        4444,
        '10.0.0.2',
        80,
        'Msg 1',
        'HELLO'
      ),
      createTcpPacket(
        '1.500000',
        '10.0.0.2',
        80,
        '10.0.0.1',
        4444,
        'Msg 2',
        'WORLD'
      ),
      createTcpPacket(
        '1.700000',
        '10.0.0.1',
        4444,
        '10.0.0.2',
        80,
        'Msg 3',
        'AGAIN'
      ),
    ];

    const user = userEvent.setup();
    render(<PcapViewer showLegend={false} initialPackets={packets as any} />);

    const firstRow = await screen.findByText('Msg 1');
    await user.click(firstRow);

    await screen.findByLabelText(/stream conversation/i);
    await waitFor(() =>
      expect(screen.queryByText(/loading stream/i)).not.toBeInTheDocument()
    );

    const messages = screen.getAllByTestId('stream-message');
    expect(messages).toHaveLength(3);
    expect(messages[0]).toHaveTextContent('HELLO');
    expect(messages[1]).toHaveTextContent('WORLD');
    expect(messages[2]).toHaveTextContent('AGAIN');
  });

  it('exports the reconstructed stream as text', async () => {
    const packets = [
      createTcpPacket(
        '2.000000',
        '192.168.0.5',
        5151,
        '192.168.0.10',
        80,
        'Req',
        'GET /'
      ),
      createTcpPacket(
        '2.100000',
        '192.168.0.10',
        80,
        '192.168.0.5',
        5151,
        'Resp',
        'HTTP/1.1 200 OK'
      ),
    ];

    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    const originalBlob = globalThis.Blob;
    const createObjectURL = jest.fn(() => 'blob:url');
    const revokeObjectURL = jest.fn();
    class MockBlob {
      parts: any[];

      type?: string;

      constructor(parts: any[], options?: BlobPropertyBag) {
        this.parts = parts;
        this.type = options?.type;
      }

      async text() {
        return this.parts
          .map((part) =>
            typeof part === 'string'
              ? part
              : part instanceof Uint8Array
              ? new TextDecoder().decode(part)
              : `${part}`
          )
          .join('');
      }
    }
    // @ts-expect-error allow reassignment for tests
    globalThis.Blob = MockBlob;
    // @ts-expect-error allow reassignment for tests
    URL.createObjectURL = createObjectURL;
    // @ts-expect-error allow reassignment for tests
    URL.revokeObjectURL = revokeObjectURL;

    const user = userEvent.setup();
    try {
      render(<PcapViewer showLegend={false} initialPackets={packets as any} />);

      const reqRow = await screen.findByText('Req');
      await user.click(reqRow);

      const exportButton = await screen.findByRole('button', {
        name: /export text/i,
      });
      await waitFor(() => expect(exportButton).not.toBeDisabled());
      await user.click(exportButton);

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      const blob = createObjectURL.mock.calls[0][0] as InstanceType<
        typeof MockBlob
      >;
      const text = await blob.text();
      expect(text).toContain('GET /');
      expect(text).toContain('HTTP/1.1 200 OK');
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:url');
    } finally {
      globalThis.Blob = originalBlob;
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });
});

