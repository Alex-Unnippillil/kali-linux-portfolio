import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WiresharkApp from '../components/apps/wireshark';
import {
  calculateChecksum,
  getInteractionMetrics,
  resetInteractionMetrics,
} from '../apps/wireshark/components/interactionMetrics';

const fivePacketFixture = () => [
  {
    timestamp: '1',
    src: '10.0.0.1',
    dest: '10.0.0.2',
    protocol: 6,
    info: 'tcp handshake',
  },
  {
    timestamp: '2',
    src: '192.168.0.5',
    dest: '192.168.0.53',
    protocol: 17,
    info: 'udp dns query',
  },
  {
    timestamp: '3',
    src: '172.16.0.1',
    dest: '172.16.0.50',
    protocol: 1,
    info: 'icmp ping',
  },
  {
    timestamp: '4',
    src: '10.0.0.3',
    dest: '10.0.0.4',
    protocol: 6,
    info: 'tcp payload',
  },
  {
    timestamp: '5',
    src: '192.168.0.60',
    dest: '192.168.0.53',
    protocol: 17,
    info: 'udp response',
  },
];

const findLast = <T,>(values: T[], predicate: (item: T) => boolean) => {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (predicate(values[i])) {
      return values[i];
    }
  }
  return undefined;
};

describe('Wireshark color rule regression', () => {
  beforeEach(() => {
    resetInteractionMetrics();
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('tracks latency, checksums, and memory for color rule lifecycle', async () => {
    const packets = fivePacketFixture();
    const clipboardWrite = jest.fn();
    if (navigator.clipboard) {
      jest
        .spyOn(navigator.clipboard, 'writeText')
        .mockImplementation(clipboardWrite);
    } else {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: clipboardWrite },
      });
    }

    const user = userEvent.setup();
    const { unmount } = render(<WiresharkApp initialPackets={packets} />);

    await user.click(screen.getByRole('button', { name: /add rule/i }));
    const expressionInput = screen.getByPlaceholderText(/filter expression/i);
    await user.type(expressionInput, 'tcp');
    await user.selectOptions(screen.getByLabelText(/^color$/i), 'Red');

    await user.click(screen.getByRole('button', { name: /export json/i }));

    const importPayload = [
      { expression: 'udp', color: 'Green' },
      { expression: 'icmp', color: 'Blue' },
    ];
    const importFile = new File(
      [JSON.stringify(importPayload)],
      'rules.json',
      { type: 'application/json' }
    );
    const fileInput = screen.getByLabelText(/color rules json file/i);
    fireEvent.change(fileInput, { target: { files: [importFile] } });

    await waitFor(() =>
      expect(screen.getByText('udp dns query').closest('tr')).toHaveClass(
        'text-green-500'
      )
    );

    await user.click(screen.getByRole('button', { name: /clear rules/i }));

    await waitFor(() =>
      expect(screen.getByText('udp dns query').closest('tr')).not.toHaveClass(
        'text-green-500'
      )
    );

    unmount();

    const metrics = getInteractionMetrics();

    expect(metrics.latencies.length).toBeGreaterThan(0);
    metrics.latencies.forEach((sample) => {
      expect(sample.latency).toBeLessThan(32);
    });

    const expectedExportChecksum = calculateChecksum([
      { expression: 'tcp', color: 'Red' },
    ]);
    const expectedImportChecksum = calculateChecksum(importPayload);
    const expectedClearedChecksum = calculateChecksum([]);

    const exportSnapshot = findLast(
      metrics.checksums,
      (sample) => sample.context === 'export'
    );
    const importSnapshot = findLast(
      metrics.checksums,
      (sample) => sample.context === 'import'
    );
    const clearSnapshot = findLast(
      metrics.checksums,
      (sample) => sample.context === 'clear'
    );

    expect(exportSnapshot?.checksum).toBe(expectedExportChecksum);
    expect(importSnapshot?.checksum).toBe(expectedImportChecksum);
    expect(clearSnapshot?.checksum).toBe(expectedClearedChecksum);

    const mountSample = metrics.memorySamples.find(
      (sample) => sample.phase === 'mount'
    );
    const unmountSample = findLast(
      metrics.memorySamples,
      (sample) => sample.phase === 'unmount'
    );

    expect(mountSample).toBeTruthy();
    expect(unmountSample).toBeTruthy();
    if (mountSample && unmountSample) {
      expect(unmountSample.size).toBeLessThanOrEqual(mountSample.size);
    }

  });
});

