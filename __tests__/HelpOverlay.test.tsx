import React from 'react';
import { render, screen } from '@testing-library/react';
import HelpOverlay, { GAME_INSTRUCTIONS } from '../components/apps/HelpOverlay';

const baseProps = {
  view: 'help' as const,
  onClose: jest.fn(),
  onViewChange: jest.fn(),
  onResume: jest.fn(),
  paused: false,
  mapping: {},
  setKey: jest.fn(),
  overlayLegend: [{ label: 'Shift + /', description: 'Cycle overlay' }],
} as const;

describe('HelpOverlay', () => {
  it('renders fallback copy when instructions are missing', () => {
    render(<HelpOverlay {...baseProps} gameId="unknown" />);
    expect(screen.getByText('Game menu')).toBeInTheDocument();
    expect(
      screen.getByText('Explore the controls below to get started.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Use on-screen prompts to interact.')
    ).toBeInTheDocument();
  });

  it('renders instructions when available', () => {
    const mapping = GAME_INSTRUCTIONS['2048'].actions ?? {};
    render(
      <HelpOverlay
        {...baseProps}
        gameId="2048"
        mapping={mapping}
        overlayLegend={[]}
      />,
    );
    expect(screen.getByText('Game menu')).toBeInTheDocument();
    expect(
      screen.getByText('Reach the 2048 tile by merging numbers.')
    ).toBeInTheDocument();
    expect(screen.getByText(/up: Arrow Up/i)).toBeInTheDocument();
  });
});
