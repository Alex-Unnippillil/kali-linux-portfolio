import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WiresharkApp from '../components/apps/wireshark';
import { getFrameDeltas } from '../components/apps/wireshark/frameMetrics';
import { toPng } from 'html-to-image';

jest.mock('html-to-image', () => ({
  toPng: jest.fn(() => Promise.resolve('data:image/png;base64,mock-export')),
}));

jest.mock('cytoscape', () => ({
  __esModule: true,
  default: { use: jest.fn() },
}));

jest.mock('cytoscape-cose-bilkent', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('react-cytoscapejs', () => {
  const React = require('react');
  const MockComponent = ({ cy }) => {
    React.useEffect(() => {
      if (cy) {
        const core = {
          layout: jest.fn().mockReturnValue({ run: jest.fn() }),
          destroy: jest.fn(),
        };
        if (typeof window !== 'undefined') {
          // @ts-ignore
          window.__mockCytoscapeCore = core;
        }
        cy(core);
      }
    }, [cy]);
    return React.createElement('div', { 'data-testid': 'cytoscape-mock' });
  };
  return { __esModule: true, default: MockComponent };
});

describe('WiresharkApp', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
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
      expect(screen.getByText('tcp packet').closest('tr')).toHaveClass('text-red-500')
    );

    const exportBtn = screen.getByRole('button', { name: /export json/i });
    await user.click(exportBtn);
    expect(writeText).toHaveBeenCalledWith(
      JSON.stringify([{ expression: 'tcp', color: 'Red' }], null, 2)
    );
  });

  it('runs simulated capture workflow and exports topology without console noise', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const anchorClick = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    const originalRAF = window.requestAnimationFrame;
    const originalCancelRAF = window.cancelAnimationFrame;
    const rafCallbacks = new Map<number, FrameRequestCallback>();
    let rafId = 0;

    window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      rafId += 1;
      rafCallbacks.set(rafId, cb);
      return rafId;
    }) as any;

    window.cancelAnimationFrame = ((id: number) => {
      rafCallbacks.delete(id);
    }) as any;

    const packets = [
      {
        timestamp: '1',
        src: '10.0.0.5',
        dest: '10.0.0.10',
        protocol: 6,
        info: 'tcp handshake',
        len: 64,
        data: new Uint8Array([1, 2, 3]),
      },
      {
        timestamp: '2',
        src: '10.0.0.10',
        dest: '10.0.0.5',
        protocol: 17,
        info: 'udp follow-up',
        len: 80,
        data: new Uint8Array([4, 5, 6]),
      },
    ];

    const user = userEvent.setup();

    const { unmount } = render(<WiresharkApp initialPackets={packets} />);
    let stillMounted = true;

    try {
      await screen.findByText('tcp handshake');

      await user.click(screen.getByRole('button', { name: /add rule/i }));
      const exprInputs = screen.getAllByPlaceholderText(/filter expression/i);
      const colorSelects = screen.getAllByLabelText(/color/i);
      await user.type(exprInputs[0], 'tcp');
      await user.selectOptions(colorSelects[0], 'Red');
      expect(screen.getByText('tcp handshake').closest('tr')).toHaveClass('text-red-500');

      await user.click(screen.getByRole('button', { name: /Flows/i }));
      const exportBtn = await screen.findByRole('button', { name: /Export PNG/i });
      await user.click(exportBtn);
      await waitFor(() => expect((toPng as jest.Mock)).toHaveBeenCalled());

      for (const [id, callback] of Array.from(rafCallbacks.entries())) {
        await act(async () => callback(id * 16));
        rafCallbacks.delete(id);
      }

      const deltas = getFrameDeltas();
      expect(deltas.length).toBeGreaterThan(0);
      expect(deltas.every((delta) => delta <= 32)).toBe(true);

      unmount();
      stillMounted = false;

      // @ts-ignore
      const core = window.__mockCytoscapeCore as { destroy: jest.Mock } | undefined;
      expect(core?.destroy).toHaveBeenCalled();

      expect(consoleError).not.toHaveBeenCalled();
      expect(consoleWarn).not.toHaveBeenCalled();
    } finally {
      if (stillMounted) {
        try {
          unmount();
        } catch {
          // ignore
        }
      }
      rafCallbacks.clear();
      window.requestAnimationFrame = originalRAF;
      window.cancelAnimationFrame = originalCancelRAF;
      anchorClick.mockRestore();
      consoleError.mockRestore();
      consoleWarn.mockRestore();
    }
  });
});

