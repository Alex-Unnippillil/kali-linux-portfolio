import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import DsniffLab from '../components/apps/dsniff';

describe('DsniffLab component', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the command builder with default commands', async () => {
    render(<DsniffLab />);
    expect(await screen.findByText(/urlsnarf -i eth0/)).toBeInTheDocument();
    expect(screen.getByText(/arpspoof -i eth0/)).toBeInTheDocument();
  });

  it('filters captured data via protocol chips', async () => {
    render(<DsniffLab />);
    fireEvent.click(screen.getByRole('button', { name: /captured data/i }));
    await screen.findByRole('table');

    const httpChip = screen.getByRole('button', { name: /^http$/i });
    fireEvent.click(httpChip);

    expect(httpChip).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText(/http/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Broadcast claims/)).toBeNull();
  });

  it('shows the guided walkthrough steps', async () => {
    render(<DsniffLab />);
    fireEvent.click(screen.getByRole('button', { name: /interpretations/i }));
    expect(await screen.findByText(/Guided walkthrough/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Collect cleartext requests/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Triaging captured credentials/i),
    ).toBeInTheDocument();
  });

  it('toggles lab mode state', async () => {
    render(<DsniffLab />);
    expect(await screen.findByText(/Lab mode off/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Enable lab mode/i }));
    expect(await screen.findByText(/Lab mode enabled/i)).toBeInTheDocument();
  });
});
