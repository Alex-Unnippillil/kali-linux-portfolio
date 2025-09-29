import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import MimikatzApp from '../../../components/apps/mimikatz';
import { commandPresets } from '../commandPresets';

type MatchMediaMock = (query: string) => MediaQueryList;

describe('Mimikatz command presets', () => {
  const originalMatchMedia = window.matchMedia;

  const createMatchMedia = (matcher: (query: string) => boolean): MatchMediaMock =>
    ((query: string) => ({
      matches: matcher(query),
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      onchange: null,
      dispatchEvent: () => false,
    })) as unknown as MatchMediaMock;

  beforeEach(() => {
    window.matchMedia = createMatchMedia(() => false);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    jest.clearAllMocks();
  });

  const highRiskPreset = commandPresets.find(
    (preset) => preset.context !== 'safe',
  );

  if (!highRiskPreset) {
    throw new Error('Expected at least one high-risk preset for tests');
  }

  it('disables high-risk presets in browser mode', () => {
    render(<MimikatzApp />);

    fireEvent.click(
      screen.getByRole('button', { name: `Select ${highRiskPreset.command}` }),
    );

    const runButton = screen.getByRole('button', { name: /run preset/i });
    expect(runButton).toBeDisabled();
    expect(
      screen.getByText(/Disabled in browser demo:/i),
    ).toHaveTextContent(highRiskPreset.contextNote);
    expect(screen.getByTestId('browser-mode-banner')).toBeInTheDocument();
  });

  it('enables high-risk presets when standalone mode is detected', () => {
    window.matchMedia = createMatchMedia((query) =>
      query.includes('display-mode: standalone'),
    );

    render(<MimikatzApp />);

    fireEvent.click(
      screen.getByRole('button', { name: `Select ${highRiskPreset.command}` }),
    );

    const runButton = screen.getByRole('button', { name: /run preset/i });
    expect(runButton).not.toBeDisabled();
    expect(screen.queryByText(/Disabled in browser demo:/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('browser-mode-banner')).not.toBeInTheDocument();
  });
});
