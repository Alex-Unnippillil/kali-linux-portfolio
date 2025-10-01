import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import SymbolImport, { parseElfMap, parsePdbMap, SymbolRecord } from '../components/apps/ghidra/SymbolImport';

beforeEach(() => {
  window.localStorage.clear();
});

describe('symbol map parsers', () => {
  it('parses PDB map entries with addresses and metadata', () => {
    const input = `0001:00001000 main 00401000 f .text 00000020\n0001:00002000 config 00402000 o .data 00000008`;
    const result = parsePdbMap(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      address: '0x00401000',
      name: 'main',
      section: '.text',
      type: 'Function',
      size: 0x20,
    });
    expect(result[1]).toMatchObject({
      address: '0x00402000',
      name: 'config',
      section: '.data',
      type: 'Object',
      size: 0x8,
    });
  });

  it('parses ELF symbol listings with sections and sizes', () => {
    const input = `0000000000401000 00000020 FUNC GLOBAL .text start\n0000000000402000 30 OBJECT GLOBAL .data config_table`;
    const result = parseElfMap(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      address: '0x00401000',
      name: 'start',
      section: '.text',
      type: 'Function',
      size: 0x20,
    });
    expect(result[1]).toMatchObject({
      address: '0x00402000',
      name: 'config_table',
      section: '.data',
      type: 'Object',
      size: 30,
    });
  });
});

describe('SymbolImport component', () => {
  const baseSymbols: SymbolRecord[] = [
    {
      address: '0x00401000',
      name: 'start',
      section: '.text',
      type: 'Function',
      size: 0x20,
      source: 'current',
    },
    {
      address: '0x00401020',
      name: 'check',
      section: '.text',
      type: 'Function',
      size: 0x30,
      source: 'current',
    },
    {
      address: '0x00401040',
      name: 'helper',
      section: '.text',
      type: 'Function',
      size: 0x10,
      source: 'current',
    },
  ];

  it('renders diff rows with resolution controls for sample data', async () => {
    render(<SymbolImport currentSymbols={baseSymbols} onMerge={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /load sample pdb map/i }));

    const conflictRow = await screen.findByText('0x00401020');
    const conflict = conflictRow.closest('tr');
    expect(conflict).not.toBeNull();
    expect(within(conflict as HTMLTableRowElement).getByText('check')).toBeInTheDocument();
    expect(within(conflict as HTMLTableRowElement).getByText('authenticate_user')).toBeInTheDocument();

    const newRow = screen.getByText('0x00401060').closest('tr');
    expect(newRow).not.toBeNull();
    expect(within(newRow as HTMLTableRowElement).getByRole('button', { name: /add symbol/i })).toBeInTheDocument();

    const missingRow = screen.getByText('0x00401040').closest('tr');
    expect(missingRow).not.toBeNull();
    expect(within(missingRow as HTMLTableRowElement).getByRole('button', { name: /remove symbol/i })).toBeInTheDocument();
  });

  it('applies merges and restores them through undo history', async () => {
    const onMerge = jest.fn();
    render(<SymbolImport currentSymbols={baseSymbols} onMerge={onMerge} />);

    fireEvent.click(screen.getByRole('button', { name: /load sample pdb map/i }));

    await screen.findByText('authenticate_user');

    fireEvent.click(screen.getByRole('button', { name: /apply merge/i }));

    await screen.findByText(/Applied/i);

    expect(onMerge).toHaveBeenCalled();
    const merged = onMerge.mock.calls[0][0] as SymbolRecord[];
    expect(merged.find((sym) => sym.address === '0x00401020')?.name).toBe('authenticate_user');
    expect(merged.some((sym) => sym.address === '0x00401060')).toBe(true);

    const undoButton = screen.getByRole('button', { name: /undo last merge/i });
    expect(undoButton).not.toBeDisabled();

    fireEvent.click(undoButton);

    expect(onMerge).toHaveBeenCalledTimes(2);
    const restored = onMerge.mock.calls[1][0] as SymbolRecord[];
    expect(restored.find((sym) => sym.address === '0x00401020')?.name).toBe('check');
    expect(restored.some((sym) => sym.address === '0x00401060')).toBe(false);
  });
});
