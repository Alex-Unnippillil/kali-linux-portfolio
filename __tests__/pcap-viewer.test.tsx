import React from 'react';
import { render, fireEvent, screen, within, waitFor } from '@testing-library/react';
import PcapViewer, { Packet } from '../apps/wireshark/components/PcapViewer';

const createPacketData = (
  protocol: number,
  src: [number, number, number, number],
  dest: [number, number, number, number],
  sport = 0,
  dport = 0
): Uint8Array => {
  const data = new Uint8Array(64);
  data[12] = 0x08;
  data[13] = 0x00;
  data[23] = protocol;
  data.set(src, 26);
  data.set(dest, 30);
  if (protocol === 6 || protocol === 17) {
    data[34] = (sport >> 8) & 0xff;
    data[35] = sport & 0xff;
    data[36] = (dport >> 8) & 0xff;
    data[37] = dport & 0xff;
  }
  return data;
};

const samplePackets: Packet[] = [
  {
    timestamp: '1.000000',
    src: '192.168.0.1',
    dest: '192.168.0.2',
    protocol: 6,
    info: 'TCP 443 → 51515',
    data: createPacketData(6, [192, 168, 0, 1], [192, 168, 0, 2], 443, 51515),
    sport: 443,
    dport: 51515,
  },
  {
    timestamp: '2.000000',
    src: '10.0.0.10',
    dest: '10.0.0.1',
    protocol: 17,
    info: 'UDP 53 → 53000',
    data: createPacketData(17, [10, 0, 0, 10], [10, 0, 0, 1], 53, 53000),
    sport: 53,
    dport: 53000,
  },
  {
    timestamp: '3.000000',
    src: '172.16.0.5',
    dest: '172.16.0.15',
    protocol: 6,
    info: 'TCP 22 → 4022',
    data: createPacketData(6, [172, 16, 0, 5], [172, 16, 0, 15], 22, 4022),
    sport: 22,
    dport: 4022,
  },
];

beforeAll(() => {
  Object.defineProperty(window.HTMLElement.prototype, 'scrollTo', {
    value: jest.fn(),
    writable: true,
  });
});

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', 'http://localhost/');
});

describe('PcapViewer virtualization', () => {
  it('filters packets using the virtualized list', () => {
    render(<PcapViewer showLegend={false} initialPackets={samplePackets} />);
    fireEvent.change(screen.getByLabelText('Quick search'), {
      target: { value: '172.16.0.5' },
    });
    const grid = screen.getByRole('grid', { name: 'Packet list' });
    expect(within(grid).getByText('172.16.0.5')).toBeInTheDocument();
    expect(screen.queryByText('192.168.0.1')).not.toBeInTheDocument();
  });

  it('supports keyboard navigation across packet rows', async () => {
    render(<PcapViewer showLegend={false} initialPackets={samplePackets} />);
    const grid = screen.getByRole('grid', { name: 'Packet list' });
    const rows = within(grid).getAllByRole('row');
    const firstRow = rows[1];
    firstRow.focus();
    fireEvent.keyDown(firstRow, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(document.activeElement?.id).toBe('pcap-row-1');
    });

    fireEvent.keyDown(document.activeElement as Element, { key: 'Enter' });
    expect(screen.queryByText('Select a packet')).not.toBeInTheDocument();
  });
});
