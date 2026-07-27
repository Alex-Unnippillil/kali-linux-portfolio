import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import MsfPostApp from '../components/apps/msf-post';

declare global {
  interface Window {
    matchMedia: (query: string) => {
      matches: boolean;
      media?: string;
      addEventListener: jest.Mock;
      removeEventListener: jest.Mock;
    };
  }
}

describe('MsfPostApp', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('lab-mode', 'true');
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  const openModule = (segments: string[], label: string) => {
    const treeRoot = screen.getByText('Module catalog').parentElement?.parentElement;
    let scope: ParentNode | null = treeRoot ?? document.body;

    segments.forEach((segment) => {
      const summary = within(scope as ParentNode).getAllByText(segment, {
        selector: 'summary',
      })[0];
      fireEvent.click(summary);
      scope = summary.parentElement;
    });
    fireEvent.click(screen.getByRole('button', { name: label }));
  };

  it('shows lab banner and renders module details', async () => {
    render(<MsfPostApp />);
    await screen.findByText('Lab Mode on: actions stay simulated.');

    openModule(['Multi', 'Recon'], 'Local Exploit Suggester');

    expect(
      screen.getByRole('heading', { name: 'Local Exploit Suggester' })
    ).toBeInTheDocument();
    const preview = screen.getByLabelText('command preview');
    expect(preview.textContent).toContain(
      'use post/multi/recon/local_exploit_suggester'
    );
    expect(preview.textContent).toContain('set SESSION 1');
  });

  it('updates command preview when module options change', async () => {
    render(<MsfPostApp />);
    await screen.findByText('Lab Mode on: actions stay simulated.');

    openModule(['Multi', 'Recon'], 'Local Exploit Suggester');

    const verboseToggle = screen.getByLabelText(
      'Enable verbose ranking output'
    );
    expect(verboseToggle).toBeChecked();
    fireEvent.click(verboseToggle);

    const preview = screen.getByLabelText('command preview');
    expect(preview.textContent).not.toContain('VERBOSE');

    const osHint = screen.getByLabelText('Target OS hint');
    fireEvent.change(osHint, { target: { value: 'Windows 11' } });
    expect(preview.textContent).toContain('set OS_HINT Windows 11');
  });

  it('displays canned report content for the selected module', async () => {
    render(<MsfPostApp />);
    await screen.findByText('Lab Mode on: actions stay simulated.');

    openModule(['Windows', 'Manage'], 'Enable RDP');

    expect(
      screen.getByText((content) =>
        content.includes(
          'Ensure RDP connectivity for blue-team detection drills while maintaining lab-safe hardening settings.'
        )
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) =>
        content.includes(
          'Windows Defender Firewall inbound rule "Lab RDP" created and scoped to 10.10.20.0/24.'
        )
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.startsWith('rdp-validation.txt'))
    ).toBeInTheDocument();
  });
});
