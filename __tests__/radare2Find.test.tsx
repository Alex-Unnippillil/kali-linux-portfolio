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

describe('Radare2 disassembly find and seek', () => {
  beforeEach(() => {
    localStorage.setItem('r2HelpDismissed', 'true');
  });

  it('cycles through find matches with next/prev', () => {
    render(<Radare2 initialData={sample} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Disassembly' }));

    const findInput = screen.getByLabelText('Find instruction');
    fireEvent.change(findInput, { target: { value: 'mov' } });

    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Prev' }));
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('validates seek input', () => {
    render(<Radare2 initialData={sample} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Disassembly' }));

    const seekInput = screen.getByLabelText('Seek to address');
    fireEvent.change(seekInput, { target: { value: 'zz' } });
    fireEvent.click(screen.getByRole('button', { name: 'Seek' }));

    expect(screen.getByText(/Enter a hex address/i)).toBeInTheDocument();
  });
});
