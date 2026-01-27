import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Radare2 from '../components/apps/radare2';

const sample = {
  file: 'demo.bin',
  hex: '554889e5b8000000005dc3',
  disasm: [
    { addr: '0x1000', text: 'push rbp' },
    { addr: '0x1001', text: 'mov rbp, rsp' },
    { addr: '0x1004', text: 'mov eax, 0' },
    { addr: '0x1009', text: 'pop rbp' },
    { addr: '0x100a', text: 'ret' },
  ],
  xrefs: {},
  blocks: [],
};

describe('Radare2 hex editor', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('r2HelpDismissed', 'true');
  });

  it('supports inline edits with undo/redo and persistence', () => {
    render(<Radare2 initialData={sample} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Hex' }));

    const hexRegion = screen.getByLabelText('Hex bytes');
    const byteButton = hexRegion.querySelector('button');
    expect(byteButton).toBeTruthy();

    fireEvent.doubleClick(byteButton as HTMLElement);

    const input = screen.getByDisplayValue('55');
    fireEvent.change(input, { target: { value: 'ff' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText(/55 → ff/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Undo/i }));
    expect(screen.getByText(/No patches staged/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Redo/i }));
    expect(screen.getByText(/55 → ff/i)).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem('r2-patches-demo.bin') || '[]');
    expect(stored).toHaveLength(1);
  });

  it('validates patch imports before applying', () => {
    render(<Radare2 initialData={sample} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Hex' }));

    const textarea = screen.getByPlaceholderText('[{"offset":4,"value":"90"}]');
    fireEvent.change(textarea, { target: { value: 'not json' } });
    fireEvent.click(screen.getByRole('button', { name: /Import JSON/i }));
    expect(screen.getByText(/Import is not valid JSON/i)).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: '[{"offset":0,"value":"zz"}]' } });
    fireEvent.click(screen.getByRole('button', { name: /Import JSON/i }));
    expect(screen.getByText(/invalid value/i)).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: '[{"offset":1,"value":"aa"}]' } });
    fireEvent.click(screen.getByRole('button', { name: /Import JSON/i }));

    expect(screen.getAllByRole('button', { name: 'Revert' })).toHaveLength(1);
  });
});
