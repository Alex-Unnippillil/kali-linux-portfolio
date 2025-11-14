import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import CommandPalette from '../../components/ui/CommandPalette';

describe('CommandPalette help integration', () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;

  beforeEach(() => {
    window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    }) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = ((id: number) => {
      return;
    }) as typeof window.cancelAnimationFrame;
  });

  afterEach(() => {
    cleanup();
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  const baseProps = {
    open: true,
    apps: [
      { id: 'terminal', title: 'Terminal', subtitle: 'Launch the simulated terminal' },
      { id: 'notes', title: 'Notes', subtitle: 'Scratchpad for quick ideas' },
    ],
    recentWindows: [{ id: 'win-1', title: 'Recon Session' }],
    settingsActions: [{ id: 'theme-dark', title: 'Switch Theme' }],
    onSelect: jest.fn(),
    onClose: jest.fn(),
  };

  it('shows help topics when the query includes help keywords', () => {
    render(<CommandPalette {...baseProps} />);

    const input = screen.getByLabelText('Search commands');
    fireEvent.change(input, { target: { value: 'terminal help' } });

    expect(screen.queryAllByText('Help Topics').length).toBeGreaterThan(0);
    expect(screen.getByText('Terminal Help')).toBeInTheDocument();
  });

  it('interleaves help topics when searching with a question mark', () => {
    const { container } = render(<CommandPalette {...baseProps} />);

    const input = screen.getByLabelText('Search commands');
    fireEvent.change(input, { target: { value: '?' } });

    expect(screen.queryAllByText('Help Topics').length).toBeGreaterThan(0);

    const list = container.querySelector('[aria-label="Command palette results"]');
    const sectionLabels = Array.from(list?.querySelectorAll('p') ?? []).map((node) => node.textContent?.trim());

    expect(sectionLabels).toEqual([
      'Recent Windows',
      'Help Topics',
      'Applications',
      'Settings & Actions',
    ]);
  });

  it('omits help topics when the query does not reference help', () => {
    render(<CommandPalette {...baseProps} />);

    const input = screen.getByLabelText('Search commands');
    fireEvent.change(input, { target: { value: 'notes' } });

    expect(screen.queryAllByText('Help Topics')).toHaveLength(0);
  });
});
