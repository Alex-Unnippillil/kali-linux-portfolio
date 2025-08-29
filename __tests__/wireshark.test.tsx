import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WiresharkApp from '../components/apps/wireshark';

describe('WiresharkApp', () => {
  beforeEach(() => {
    window.localStorage.clear();
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

    // Only packets matching the filter should remain
    expect(screen.getByText('bar')).toBeInTheDocument();
    expect(screen.queryByText('foo')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('wireshark-filter')).toBe('bar');

    // Unmount and remount to ensure the filter persists
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

    const tcpRow = screen.getByText('tcp packet').closest('tr');
    const udpRow = screen.getByText('udp packet').closest('tr');
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
    const user = userEvent.setup();
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
});

