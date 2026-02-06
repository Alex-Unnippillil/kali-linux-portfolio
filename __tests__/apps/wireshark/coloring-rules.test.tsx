import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ColoringProvider } from '../../../components/apps/wireshark/coloringContext';
import ColorRuleEditor from '../../../apps/wireshark/components/ColorRuleEditor';
import PcapViewer from '../../../apps/wireshark/components/PcapViewer';

describe('Coloring rules integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.style.cssText = '';
  });

  it('loads default palette and updates rows when importing new rules', async () => {
    const packets = [
      {
        timestamp: '1',
        src: '1.1.1.1',
        dest: '2.2.2.2',
        protocol: 6,
        info: 'tcp packet',
        data: new Uint8Array(),
      },
    ];

    render(
      <ColoringProvider>
        <ColorRuleEditor />
        <PcapViewer showLegend={false} initialPackets={packets} />
      </ColoringProvider>
    );

    const row = await screen.findByText('tcp packet');
    const initial = row.closest('tr') as HTMLTableRowElement;
    expect(initial).toHaveClass('ws-colored');
    expect(initial.style.getPropertyValue('--ws-row-bg')).toBe(
      'var(--wireshark-color-red-bg)'
    );
    expect(
      document.documentElement.style.getPropertyValue(
        '--wireshark-color-red-bg'
      )
    ).toBe('#7f1d1d');

    const file = new File(
      [JSON.stringify([{ expression: 'tcp', color: '#123456' }])],
      'rules.json',
      { type: 'application/json' }
    );
    const input = screen.getByLabelText(/color rules json file/i);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const updated = screen.getByText('tcp packet').closest(
        'tr'
      ) as HTMLTableRowElement;
      expect(updated.style.getPropertyValue('--ws-row-bg')).toBe('#123456');
      expect(updated.className).toContain('ws-colored');
    });
  });
});
