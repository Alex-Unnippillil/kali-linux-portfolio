import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WiresharkApp from '../components/apps/wireshark';
import { parsePcap } from '../utils/pcap';

jest.mock('../utils/pcap', () => ({
  parsePcap: jest.fn(),
  default: jest.fn(),
}));

describe('WiresharkApp', () => {
  beforeEach(() => {
    window.localStorage.clear();
    (parsePcap as jest.Mock).mockReset();
  });

  it('persists filter expressions via localStorage', async () => {
    const packets = [
      { timestamp: '1', src: '1.1.1.1', dest: '2.2.2.2', protocol: 6, info: 'foo' },
      { timestamp: '2', src: '3.3.3.3', dest: '4.4.4.4', protocol: 17, info: 'bar' },
    ];
    const user = userEvent.setup();
    const { unmount } = render(<WiresharkApp initialPackets={packets} />);

    const filterInput = screen.getByPlaceholderText(/quick search/i);
    await user.type(filterInput, 'bar');

    expect(screen.getByText('bar')).toBeInTheDocument();
    expect(screen.queryByText('foo')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('wireshark-filter')).toBe('bar');

    unmount();
    render(<WiresharkApp initialPackets={packets} />);
    expect(screen.getByPlaceholderText(/quick search/i)).toHaveValue('bar');
    expect(screen.getByText('bar')).toBeInTheDocument();
    expect(screen.queryByText('foo')).not.toBeInTheDocument();
  });

  it('applies coloring rules for filter expressions', async () => {
    const packets = [
      { timestamp: '1', src: '1.1.1.1', dest: '2.2.2.2', protocol: 6, info: 'tcp packet' },
      { timestamp: '2', src: '3.3.3.3', dest: '8.8.8.8', protocol: 17, info: 'udp packet' },
    ];

    const user = userEvent.setup();
    render(<WiresharkApp initialPackets={packets} />);

    const addBtn = screen.getByRole('button', { name: /add rule/i });
    await user.click(addBtn);
    let exprInputs = screen.getAllByPlaceholderText(/filter expression/i);
    let colorSelects = screen.getAllByLabelText(/color/i);
    await user.type(exprInputs[0], 'tcp');
    await user.selectOptions(colorSelects[0], 'Red');

    await user.click(addBtn);
    exprInputs = screen.getAllByPlaceholderText(/filter expression/i);
    colorSelects = screen.getAllByLabelText(/color/i);
    await user.type(exprInputs[1], 'ip.addr == 8.8.8.8');
    await user.selectOptions(colorSelects[1], 'Blue');

    const tcpRow = screen.getByText('tcp packet').closest('[data-row]');
    const udpRow = screen.getByText('udp packet').closest('[data-row]');
    expect(tcpRow).toHaveClass('text-red-500');
    expect(udpRow).toHaveClass('text-blue-500');
  });

  it('filters packets by protocol chips', async () => {
    const packets = [
      { timestamp: '1', src: '1.1.1.1', dest: '2.2.2.2', protocol: 6, info: 'tcp packet' },
      { timestamp: '2', src: '3.3.3.3', dest: '4.4.4.4', protocol: 17, info: 'udp packet' },
    ];
    const user = userEvent.setup();
    render(<WiresharkApp initialPackets={packets} />);

    const udpChip = screen.getByRole('button', { name: /udp/i });
    await user.click(udpChip);

    expect(screen.getByText('udp packet')).toBeInTheDocument();
    expect(screen.queryByText('tcp packet')).not.toBeInTheDocument();
  });

  it('reveals plaintext column when TLS keys uploaded', async () => {
    const packets = [
      {
        timestamp: '1',
        src: '1.1.1.1',
        dest: '2.2.2.2',
        protocol: 6,
        info: 'foo',
        plaintext: 'secret',
      },
    ];
    render(<WiresharkApp initialPackets={packets} />);

    expect(screen.queryByText(/plaintext/i)).not.toBeInTheDocument();

    const file = new File(['dummy'], 'key.log', { type: 'text/plain' });
    const upload = screen.getByLabelText(/tls key file/i);
    fireEvent.change(upload, { target: { files: [file] } });

    expect(await screen.findByText(/plaintext/i)).toBeInTheDocument();
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('provides quick search and docs link', () => {
    render(<WiresharkApp initialPackets={[]} />);
    expect(screen.getByPlaceholderText(/quick search/i)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /display filter docs/i });
    expect(link).toHaveAttribute(
      'href',
      'https://www.wireshark.org/docs/dfref/'
    );
  });

  it('imports and exports color rules via JSON', async () => {
    const packets = [
      { timestamp: '1', src: '1.1.1.1', dest: '2.2.2.2', protocol: 6, info: 'tcp packet' },
    ];
    const writeText = jest.fn();
    if (navigator.clipboard) {
      jest.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText);
    } else {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
      });
    }
    const user = userEvent.setup();
    render(<WiresharkApp initialPackets={packets} />);

    const file = new File(
      [JSON.stringify([{ expression: 'tcp', color: 'Red' }])],
      'rules.json',
      { type: 'application/json' }
    );
    const input = screen.getByLabelText(/color rules json file/i);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByText('tcp packet').closest('[data-row]')).toHaveClass('text-red-500')
    );

    const exportBtn = screen.getByRole('button', { name: /export json/i });
    await user.click(exportBtn);
    expect(writeText).toHaveBeenCalledWith(
      JSON.stringify([{ expression: 'tcp', color: 'Red' }], null, 2)
    );
  });

  it('steps through playback in simulation mode', async () => {
    const packets = [
      { timestamp: '1', src: '1.1.1.1', dest: '2.2.2.2', protocol: 6, info: 'tcp packet' },
    ];
    const user = userEvent.setup();
    render(<WiresharkApp initialPackets={packets} />);

    await user.click(screen.getByRole('button', { name: /stop/i }));
    expect(screen.queryByText('tcp packet')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /step/i }));
    expect(screen.getByText('tcp packet')).toBeInTheDocument();
  });

  it('loads capture files via the parser', async () => {
    (parsePcap as jest.Mock).mockReturnValue([
      {
        timestamp: '1.000000',
        timestampMs: 1000,
        src: '1.1.1.1',
        dest: '2.2.2.2',
        protocol: 6,
        info: 'tcp packet',
        len: 64,
        data: new Uint8Array(),
        layers: {},
      },
    ]);

    render(<WiresharkApp />);

    const file = new File([new Uint8Array([1, 2, 3])], 'capture.pcap', {
      type: 'application/octet-stream',
    });
    Object.defineProperty(file, 'arrayBuffer', {
      value: () => Promise.resolve(new ArrayBuffer(3)),
    });
    const upload = screen.getByLabelText(/upload capture file/i);
    fireEvent.change(upload, { target: { files: [file] } });

    await waitFor(() => expect(parsePcap).toHaveBeenCalled());
    expect(screen.getByText('tcp packet')).toBeInTheDocument();
  });

  it('persists playback and filter preferences', async () => {
    const packets = [
      { timestamp: '1', src: '1.1.1.1', dest: '2.2.2.2', protocol: 6, info: 'tcp packet' },
      { timestamp: '2', src: '3.3.3.3', dest: '4.4.4.4', protocol: 17, info: 'udp packet' },
    ];
    const user = userEvent.setup();
    const { unmount } = render(<WiresharkApp initialPackets={packets} />);

    const bpfInput = screen.getByLabelText(/bpf filter/i);
    await user.type(bpfInput, 'tcp');
    await user.click(screen.getByRole('button', { name: /udp/i }));
    await user.click(screen.getByRole('button', { name: /flows/i }));
    await user.selectOptions(screen.getByLabelText(/speed/i), '2');
    await user.click(screen.getByLabelText(/loop playback/i));

    unmount();
    render(<WiresharkApp initialPackets={packets} />);

    expect(screen.getByLabelText(/bpf filter/i)).toHaveValue('tcp');
    expect(screen.getByRole('button', { name: /udp/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /flows/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText(/speed/i)).toHaveValue('2');
    expect(screen.getByLabelText(/loop playback/i)).toBeChecked();
  });
});
