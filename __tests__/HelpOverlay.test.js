import React from 'react';
import { render, screen } from '@testing-library/react';
import HelpOverlay from '../components/apps/HelpOverlay';
import { jsx as _jsx } from "react/jsx-runtime";
describe('HelpOverlay', () => {
  it('returns null when no instructions exist for the game', () => {
    const {
      container
    } = render(/*#__PURE__*/_jsx(HelpOverlay, {
      gameId: "unknown",
      onClose: () => {}
    }));
    expect(container.firstChild).toBeNull();
  });
  it('renders instructions when available', () => {
    render(/*#__PURE__*/_jsx(HelpOverlay, {
      gameId: "2048",
      onClose: () => {}
    }));
    expect(screen.getByText('2048 Help')).toBeInTheDocument();
    expect(screen.getByText('Reach the 2048 tile by merging numbers.')).toBeInTheDocument();
    expect(screen.getByText(/up: ArrowUp/i)).toBeInTheDocument();
  });
});
