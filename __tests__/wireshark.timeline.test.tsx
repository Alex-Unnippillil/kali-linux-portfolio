import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import PcapViewer from '../apps/wireshark/components/PcapViewer';
import { createTimelineStore } from '../apps/wireshark/components/timelineStore';

const createPacket = (i: number) => ({
  timestamp: `${i}`,
  timestampSeconds: i,
  src: `10.0.0.${i % 255}`,
  dest: `10.0.1.${i % 255}`,
  protocol: i % 2 ? 6 : 17,
  info: `Packet ${i}`,
  data: new Uint8Array([i % 255]),
});

describe('PcapViewer timeline integration', () => {
  beforeAll(() => {
    if (!window.requestAnimationFrame) {
      window.requestAnimationFrame = (cb: FrameRequestCallback) =>
        window.setTimeout(() => cb(performance.now()), 0);
    }
    if (!window.cancelAnimationFrame) {
      window.cancelAnimationFrame = window.clearTimeout;
    }
    if (!HTMLCanvasElement.prototype.getContext) {
      HTMLCanvasElement.prototype.getContext = () => ({
        clearRect: () => {},
        fillRect: () => {},
      }) as unknown as CanvasRenderingContext2D;
    }
  });

  it('virtualizes packet rows for large datasets', async () => {
    const packets = Array.from({ length: 2000 }, (_, i) => createPacket(i));
    render(<PcapViewer showLegend={false} initialPackets={packets} />);

    await waitFor(() => {
      const rows = screen.getAllByTestId('packet-row');
      expect(rows.length).toBeLessThan(200);
    });
  });

  it('updates visible packets when the timeline window changes', async () => {
    const packets = Array.from({ length: 500 }, (_, i) => createPacket(i));
    const timelineStore = createTimelineStore();
    render(
      <PcapViewer
        showLegend={false}
        initialPackets={packets}
        timelineStore={timelineStore}
      />
    );

    expect(await screen.findByText('Packet 10')).toBeInTheDocument();

    act(() => {
      timelineStore.setWindow([400, 450]);
    });

    await waitFor(() => {
      expect(screen.queryByText('Packet 10')).not.toBeInTheDocument();
      expect(screen.getByText('Packet 420')).toBeInTheDocument();
    });
  });
});
