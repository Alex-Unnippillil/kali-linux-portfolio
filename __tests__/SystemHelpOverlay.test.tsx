import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HelpOverlay, {
  HelpOverlayContext,
  HelpOverlayContextMetadata,
} from '../components/system/HelpOverlay';

describe('System HelpOverlay', () => {
  beforeEach(() => {
    window.localStorage.removeItem('keymap');
  });

  it('lists shortcuts and highlights conflicts', () => {
    window.localStorage.setItem(
      'keymap',
      JSON.stringify({
        'Show keyboard shortcuts': 'A',
        'Open settings': 'A',
      })
    );

    const value = {
      context: null as HelpOverlayContextMetadata | null,
      setContext: jest.fn(),
    };

    render(
      <HelpOverlayContext.Provider value={value}>
        <HelpOverlay />
      </HelpOverlayContext.Provider>
    );

    fireEvent.keyDown(window, { key: 'a' });

    expect(screen.getByText('Show keyboard shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Open settings')).toBeInTheDocument();

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAttribute('data-conflict', 'true');
    expect(items[1]).toHaveAttribute('data-conflict', 'true');
  });

  it('renders context shortcuts when metadata is provided', () => {
    window.localStorage.setItem(
      'keymap',
      JSON.stringify({
        'Show keyboard shortcuts': 'A',
        'Open settings': 'Ctrl+,',
      })
    );

    const context: HelpOverlayContextMetadata = {
      appId: 'terminal',
      appName: 'Terminal',
      shortcuts: [
        { description: 'Open a new tab', keys: 'Ctrl+T' },
        { description: 'Close the current tab', keys: 'Ctrl+W' },
      ],
    };

    const value = {
      context,
      setContext: jest.fn(),
    };

    render(
      <HelpOverlayContext.Provider value={value}>
        <HelpOverlay />
      </HelpOverlayContext.Provider>
    );

    fireEvent.keyDown(window, { key: 'a' });

    expect(screen.getByText('Active app — Terminal')).toBeInTheDocument();
    expect(screen.getByText('Open a new tab')).toBeInTheDocument();
    expect(screen.getByText('Close the current tab')).toBeInTheDocument();
    expect(screen.getByText('Show keyboard shortcuts')).toBeInTheDocument();
  });
});
