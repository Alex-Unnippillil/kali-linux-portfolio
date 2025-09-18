import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FirstBootChecklist from '../components/apps/first-boot/FirstBootChecklist';
import { FIRST_BOOT_CHECKLIST_STORAGE_KEY } from '../utils/firstBootChecklist';

describe('FirstBootChecklist', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('records completion under ten minutes and unlocks the summary at 100% progress', async () => {
    const user = userEvent.setup();
    let currentTime = Date.UTC(2024, 0, 1, 0, 0, 0);
    jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

    render(<FirstBootChecklist />);

    expect(screen.queryByRole('heading', { name: /setup summary/i })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/^hostname$/i), 'kali-lab');
    await user.click(screen.getByRole('button', { name: /mark hostname step complete/i }));

    await user.type(screen.getByLabelText(/^primary username$/i), 'analyst');
    await user.click(screen.getByRole('button', { name: /mark user account step complete/i }));

    await user.click(screen.getByLabelText(/enabled with keys and hardened config/i));
    await user.type(
      screen.getByLabelText(/notes \(port, key paths, bastion requirements\)/i),
      'Port 2222; keys only',
    );
    await user.click(screen.getByRole('button', { name: /mark ssh step complete/i }));

    await user.type(
      screen.getByLabelText(/^last command run$/i),
      'sudo apt update && sudo apt upgrade',
    );
    await user.click(screen.getByRole('button', { name: /mark updates step complete/i }));

    expect(screen.queryByRole('heading', { name: /setup summary/i })).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/enabled \(e\.g\. ufw allow openssh\)/i));
    await user.type(
      screen.getByLabelText(/rules \/ logging notes/i),
      'Allow SSH from bastion; log dropped inbound',
    );
    currentTime += 9 * 60 * 1000;
    await user.click(screen.getByRole('button', { name: /mark firewall step complete/i }));

    const summaryHeading = await screen.findByRole('heading', { name: /setup summary/i });
    expect(summaryHeading).toBeInTheDocument();
    expect(screen.getByText(/Completed in 9 minutes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export summary/i })).toBeEnabled();

    const raw = localStorage.getItem(FIRST_BOOT_CHECKLIST_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.completedAt).toBeDefined();
    expect(parsed.startedAt).toBeDefined();
    const diff = Date.parse(parsed.completedAt) - Date.parse(parsed.startedAt);
    expect(diff).toBeLessThanOrEqual(10 * 60 * 1000);
  });
});

