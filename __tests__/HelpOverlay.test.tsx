import React from 'react';
import { render, screen } from '@testing-library/react';
import HelpOverlay from '../components/apps/HelpOverlay';

describe('HelpOverlay', () => {
  it('returns null when no instructions exist for the game', () => {
    const { container } = render(<HelpOverlay gameId="unknown" onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

    it('renders instructions when available', () => {
      render(<HelpOverlay gameId="asteroids" onClose={() => {}} />);
      expect(screen.getByText('asteroids Help')).toBeInTheDocument();
      expect(
        screen.getByText('Destroy asteroids without crashing your ship.')
      ).toBeInTheDocument();
      expect(screen.getByText(/left: ArrowLeft/i)).toBeInTheDocument();
    });
  });
