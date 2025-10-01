import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PcapViewer, {
  Packet,
} from '../../../apps/wireshark/components/PcapViewer';

jest.mock('react-virtualized-auto-sizer', () => ({
  __esModule: true,
  default: ({ children }: { children: (size: { height: number; width: number }) => React.ReactNode }) =>
    children({ height: 400, width: 600 }),
}));

declare global {
  var ResizeObserver: typeof window.ResizeObserver;
}

describe('PcapViewer', () => {
  beforeAll(() => {
    // Minimal ResizeObserver mock for virtualized list measurements
    // @ts-expect-error - test environment shim
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: jest.fn() },
    });
  });

  beforeEach(() => {
    window.localStorage.clear();
    (navigator.clipboard.writeText as jest.Mock | undefined)?.mockReset?.();
  });

  const createPacket = (index: number): Packet => ({
    timestamp: `0.${index.toString().padStart(6, '0')}`,
    src: `192.168.0.${index % 255}`,
    dest: `10.0.0.${(index * 3) % 255}`,
    protocol: index % 2 === 0 ? 6 : 17,
    info: `Packet ${index}`,
    data: new Uint8Array([0, 1, 2, 3]),
  });

  it('virtualizes packet rows', async () => {
    const packets = Array.from({ length: 200 }, (_, index) => createPacket(index));
    render(<PcapViewer initialPackets={packets} />);

    const rows = await screen.findAllByTestId('packet-row');
    expect(rows.length).toBeLessThan(50);
    expect(rows[0]).toHaveTextContent('Packet 0');
  });

  it('saves and restores views from localStorage', async () => {
    const packets = [createPacket(0), createPacket(1), createPacket(2)];
    const user = userEvent.setup();

    render(<PcapViewer initialPackets={packets} />);

    const quickSearch = await screen.findByPlaceholderText('Quick search (e.g. tcp)');
    await user.clear(quickSearch);
    await user.type(quickSearch, 'tcp');

    await user.click(screen.getByText('Add condition'));
    const valueInput = screen.getByLabelText('Value for condition 1');
    await user.type(valueInput, '192.168');

    const viewNameInput = screen.getByLabelText('View name');
    await user.clear(viewNameInput);
    await user.type(viewNameInput, 'Investigation');

    await user.click(screen.getByText('Save view'));

    await waitFor(() => {
      const stored = window.localStorage.getItem('wireshark:pcap-views');
      expect(stored).not.toBeNull();
      expect(stored).toContain('Investigation');
    });

    await user.clear(quickSearch);
    await user.click(screen.getByLabelText('Remove condition 1'));

    await user.selectOptions(screen.getByLabelText('Saved views'), 'Investigation');

    expect(quickSearch).toHaveValue('tcp');
    expect(screen.getByLabelText('Value for condition 1')).toHaveValue('192.168');
  });
});
