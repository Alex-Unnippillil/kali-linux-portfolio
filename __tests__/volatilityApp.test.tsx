import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import VolatilityApp from '../components/apps/volatility';

function loadMemoryFixture() {
  const { buildVolatilityMemoryFixture } = require('../tests/builders/volatility') as typeof import('../tests/builders/volatility');
  return buildVolatilityMemoryFixture({
    pstree: [
      {
        pid: 4,
        name: 'System',
        children: [
          {
            pid: 248,
            name: 'smss.exe',
            children: [],
          },
        ],
      },
    ],
    dlllist: {
      '248': [{ base: '0x2000', name: 'smss.exe' }],
    },
  });
}

function loadPslistFixture() {
  const { buildVolatilityPsListFixture } = require('../tests/builders/volatility') as typeof import('../tests/builders/volatility');
  return buildVolatilityPsListFixture();
}

function loadNetscanFixture() {
  const { buildVolatilityNetscanFixture } = require('../tests/builders/volatility') as typeof import('../tests/builders/volatility');
  return buildVolatilityNetscanFixture();
}

jest.mock('../public/demo-data/volatility/memory.json', () => ({
  __esModule: true,
  default: loadMemoryFixture(),
}));

jest.mock('../public/demo-data/volatility/pslist.json', () => ({
  __esModule: true,
  default: loadPslistFixture(),
}));

jest.mock('../public/demo-data/volatility/netscan.json', () => ({
  __esModule: true,
  default: loadNetscanFixture(),
}));

describe('VolatilityApp demo', () => {
  test('renders process tree and modules from builder fixtures', () => {
    render(<VolatilityApp />);
    expect(screen.getByText(/System \(4\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/smss\.exe \(248\)/i));
    expect(screen.getByText('0x2000')).toBeInTheDocument();
  });

  test('shows yara heuristics badges', () => {
    render(<VolatilityApp />);
    fireEvent.click(screen.getByText('yarascan'));

    const heuristic = screen.getByText('suspicious');
    expect(heuristic).toHaveClass('bg-yellow-600');
  });
});
