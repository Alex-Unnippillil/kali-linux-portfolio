import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Radare2 from '../components/apps/radare2';

describe('Radare2 analysis sidebar', () => {
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

  beforeEach(() => {
    localStorage.clear();
  });

  it('renders sidebar summary and updates bookmark count', () => {
    render(<Radare2 initialData={sample} />);

    expect(screen.getByText('Inspector')).toBeInTheDocument();
    expect(screen.getByTestId('process-name')).toHaveTextContent('demo.bin');
    const bookmarkCount = screen.getByTestId('bookmark-count');
    expect(bookmarkCount).toHaveTextContent('0');

    fireEvent.click(screen.getByRole('tab', { name: 'Disassembly' }));

    const bookmarkButton = screen.getByRole('button', {
      name: /Bookmark address 0x1000/i,
    });
    fireEvent.click(bookmarkButton);

    expect(screen.getByTestId('bookmark-count')).toHaveTextContent('1');
  });

  it('filters instructions using quick heuristics', () => {
    render(<Radare2 initialData={sample} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Disassembly' }));

    const memoryWritesFilter = screen.getByRole('button', {
      name: /Memory Writes \(2\)/i,
    });
    fireEvent.click(memoryWritesFilter);

    expect(screen.getAllByTestId('disasm-item')).toHaveLength(2);

    fireEvent.click(memoryWritesFilter);
    expect(screen.getAllByTestId('disasm-item')).toHaveLength(sample.disasm.length);
  });
});
