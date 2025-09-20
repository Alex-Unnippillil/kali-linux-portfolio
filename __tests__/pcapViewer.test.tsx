import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PcapViewer, { Packet } from '../apps/wireshark/components/PcapViewer';

const makePacket = (overrides: Partial<Packet>): Packet => ({
  timestamp: '0.000000',
  src: '0.0.0.0',
  dest: '0.0.0.0',
  protocol: 6,
  info: '',
  data: new Uint8Array(),
  ...overrides,
});

describe('PcapViewer CSV export', () => {
  let createObjectURLMock: jest.Mock;
  let revokeObjectURLMock: jest.Mock;
  let anchorClickSpy: jest.SpyInstance<void, []>;
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  const originalBlob = global.Blob;

  class MockBlob {
    public readonly parts: BlobPart[];
    public readonly type: string;

    constructor(parts: BlobPart[], options?: BlobPropertyBag) {
      this.parts = parts;
      this.type = options?.type ?? '';
    }

    async text(): Promise<string> {
      return this.parts
        .map((part) => {
          if (typeof part === 'string') return part;
          if (part instanceof ArrayBuffer) {
            return Buffer.from(part).toString('utf-8');
          }
          if (ArrayBuffer.isView(part)) {
            return Buffer.from(part.buffer).toString('utf-8');
          }
          return String(part);
        })
        .join('');
    }
  }

  beforeEach(() => {
    createObjectURLMock = jest.fn(() => 'blob:mock-url');
    revokeObjectURLMock = jest.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURLMock,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURLMock,
    });
    Object.defineProperty(global, 'Blob', {
      configurable: true,
      writable: true,
      value: MockBlob,
    });
    anchorClickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: originalCreate,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: originalRevoke,
    });
    Object.defineProperty(global, 'Blob', {
      configurable: true,
      writable: true,
      value: originalBlob,
    });
  });

  it('maintains the current column order in exported CSV files', async () => {
    const packets: Packet[] = [
      makePacket({
        timestamp: '1.000001',
        src: '10.0.0.1',
        dest: '10.0.0.2',
        protocol: 6,
        info: 'tcp handshake',
      }),
      makePacket({
        timestamp: '2.000002',
        src: '10.0.0.3',
        dest: '10.0.0.4',
        protocol: 17,
        info: 'udp handshake',
      }),
    ];
    const user = userEvent.setup();

    render(<PcapViewer showLegend={false} initialPackets={packets} />);

    const protocolHeader = screen.getByText('Protocol');
    const timeHeader = screen.getByText('Time');
    fireEvent.dragStart(protocolHeader);
    fireEvent.dragOver(timeHeader);
    fireEvent.drop(timeHeader);

    const headerCells = screen.getAllByRole('columnheader');
    expect(headerCells.map((cell) => cell.textContent)).toEqual([
      'Protocol',
      'Time',
      'Source',
      'Destination',
      'Info',
    ]);

    await user.click(screen.getByRole('button', { name: /export csv/i }));

    await waitFor(() => expect(createObjectURLMock).toHaveBeenCalledTimes(1));

    const blob = createObjectURLMock.mock.calls[0][0] as Blob;
    const csvText = await blob.text();
    const lines = csvText.trim().split(/\r?\n/);

    expect(lines[0]).toBe('Protocol,Time,Source,Destination,Info');
    expect(lines[1]).toBe('TCP,1.000001,10.0.0.1,10.0.0.2,tcp handshake');
    expect(anchorClickSpy).toHaveBeenCalled();
    await waitFor(() => expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url'));
  });

  it('only exports packets that match the quick filter', async () => {
    const packets: Packet[] = [
      makePacket({
        timestamp: '1.000001',
        src: '10.0.0.1',
        dest: '10.0.0.2',
        protocol: 6,
        info: 'tcp handshake',
      }),
      makePacket({
        timestamp: '2.000002',
        src: '10.0.0.3',
        dest: '10.0.0.4',
        protocol: 17,
        info: 'udp handshake',
      }),
      makePacket({
        timestamp: '3.000003',
        src: '192.168.0.5',
        dest: '192.168.0.6',
        protocol: 6,
        info: 'tcp fin',
      }),
    ];
    const user = userEvent.setup();

    render(<PcapViewer showLegend={false} initialPackets={packets} />);

    const filterInput = screen.getByPlaceholderText(/quick search/i);
    await user.clear(filterInput);
    await user.type(filterInput, 'udp');

    await waitFor(() => {
      expect(screen.getByText('udp handshake')).toBeInTheDocument();
      expect(screen.queryByText('tcp handshake')).not.toBeInTheDocument();
      expect(screen.queryByText('tcp fin')).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /export csv/i }));

    await waitFor(() => expect(createObjectURLMock).toHaveBeenCalledTimes(1));

    const blob = createObjectURLMock.mock.calls[0][0] as Blob;
    const csvText = await blob.text();
    const lines = csvText.trim().split(/\r?\n/);

    expect(lines).toEqual([
      'Time,Source,Destination,Protocol,Info',
      '2.000002,10.0.0.3,10.0.0.4,UDP,udp handshake',
    ]);
  });
});
