import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StartupManager from '../../../components/apps/startup-manager';
import { startupEntries } from '../../../utils/startupEntries';
import {
  logStartupDelayChange,
  logStartupImpactSnapshot,
  logStartupToggle,
} from '../../../utils/analytics';

jest.mock('../../../utils/analytics', () => ({
  __esModule: true,
  logStartupDelayChange: jest.fn(),
  logStartupImpactSnapshot: jest.fn(),
  logStartupToggle: jest.fn(),
}));

describe('StartupManager app', () => {
  beforeEach(() => {
    localStorage.clear();
    (logStartupDelayChange as jest.Mock).mockReset();
    (logStartupImpactSnapshot as jest.Mock).mockReset();
    (logStartupToggle as jest.Mock).mockReset();
  });

  it('renders startup entries with summary and persists defaults', async () => {
    render(<StartupManager />);

    await waitFor(() => expect(logStartupImpactSnapshot).toHaveBeenCalled());

    expect(screen.getByText('Startup Manager')).toBeInTheDocument();
    const firstEntry = startupEntries[0];
    expect(screen.getByText(firstEntry.name)).toBeInTheDocument();

    const toggle = screen.getByLabelText(
      `Toggle ${firstEntry.name}`
    ) as HTMLInputElement;
    expect(toggle.checked).toBe(firstEntry.defaultEnabled);

    const summary = screen.getByText(/Aggregate impact score/);
    const totalImpact = startupEntries.reduce(
      (sum, entry) => (entry.defaultEnabled ? sum + entry.impactScore : sum),
      0
    );
    expect(summary).toHaveTextContent(String(totalImpact));

    await waitFor(() =>
      expect(localStorage.getItem('startup-manager-preferences')).toBeTruthy()
    );
  });

  it('stores preference changes and warns when disabling heavy entries', async () => {
    const heavyEntry = startupEntries.find((entry) => entry.heavy);
    expect(heavyEntry).toBeDefined();

    render(<StartupManager />);
    await waitFor(() => expect(logStartupImpactSnapshot).toHaveBeenCalled());

    const toggle = screen.getByLabelText(
      `Toggle ${heavyEntry!.name}`
    ) as HTMLInputElement;
    fireEvent.click(toggle);

    await waitFor(() => expect(toggle.checked).toBe(false));
    await waitFor(() =>
      expect(logStartupToggle).toHaveBeenCalledWith(
        heavyEntry!.id,
        false,
        heavyEntry!.impactScore
      )
    );
    await waitFor(() =>
      expect(logStartupImpactSnapshot).toHaveBeenCalledTimes(2)
    );

    const raw = localStorage.getItem('startup-manager-preferences');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw || '{}');
    expect(parsed.enabled[heavyEntry!.id]).toBe(false);
    expect(screen.getByText(heavyEntry!.warning!)).toBeInTheDocument();
  });

  it('updates delays, logs analytics, and persists changes', async () => {
    const adjustable = startupEntries.find((entry) => !entry.heavy);
    expect(adjustable).toBeDefined();

    render(<StartupManager />);
    await waitFor(() => expect(logStartupImpactSnapshot).toHaveBeenCalled());
    (logStartupImpactSnapshot as jest.Mock).mockClear();

    const delayInput = screen.getByLabelText(
      `Delay ${adjustable!.name}`
    ) as HTMLInputElement;
    fireEvent.change(delayInput, { target: { value: '12' } });

    await waitFor(() => expect(delayInput.value).toBe('12'));
    await waitFor(() =>
      expect(logStartupDelayChange).toHaveBeenCalledWith(adjustable!.id, 12)
    );
    await waitFor(() => expect(logStartupImpactSnapshot).toHaveBeenCalled());

    const stored = JSON.parse(
      localStorage.getItem('startup-manager-preferences') || '{}'
    );
    expect(stored.delays[adjustable!.id]).toBe(12);
  });
});
