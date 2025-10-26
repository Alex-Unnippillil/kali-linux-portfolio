import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsDrawer from '../components/SettingsDrawer';
import { useSettings } from '../hooks/useSettings';

jest.mock('../hooks/useSettings', () => {
  const actual = jest.requireActual('../hooks/useSettings');
  return {
    ...actual,
    useSettings: jest.fn(),
  };
});

const mockUseSettings = useSettings as jest.MockedFunction<typeof useSettings>;

const setupSettingsMock = () => {
  const setTheme = jest.fn();
  const setAccent = jest.fn();
  mockUseSettings.mockReturnValue({
    accent: '#1793d1',
    setAccent,
    theme: 'default',
    setTheme,
  } as unknown as ReturnType<typeof useSettings>);
  return { setTheme, setAccent };
};

describe('SettingsDrawer theme locks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders locked themes as disabled with guidance', async () => {
    const user = userEvent.setup();
    setupSettingsMock();

    render(<SettingsDrawer highScore={0} />);
    await user.click(screen.getByRole('button', { name: /settings/i }));

    const neonLock = screen.getByRole('button', {
      name: /neon theme locked/i,
    });
    expect(neonLock).toBeDisabled();
    expect(neonLock).toHaveAttribute('data-locked', 'true');
    expect(neonLock).toHaveAttribute(
      'title',
      expect.stringContaining('Reach 100 points')
    );
    expect(
      screen.getByText(/Beat the required high score/i)
    ).toBeInTheDocument();
  });

  test('updates unlocks when the high score increases', async () => {
    const user = userEvent.setup();
    const { setTheme } = setupSettingsMock();

    const view = render(<SettingsDrawer highScore={0} />);
    await user.click(screen.getByRole('button', { name: /settings/i }));

    expect(
      screen.getByRole('button', { name: /neon theme locked/i })
    ).toBeDisabled();

    view.rerender(<SettingsDrawer highScore={150} />);

    const neonOption = await screen.findByRole('radio', {
      name: /neon theme/i,
    });
    expect(neonOption).toHaveAttribute('aria-checked', 'false');
    await user.click(neonOption);
    expect(setTheme).toHaveBeenCalledWith('neon');
    expect(
      screen.queryByRole('button', { name: /neon theme locked/i })
    ).not.toBeInTheDocument();
  });

  test('locked preview reflects the current high score in its message', async () => {
    const user = userEvent.setup();
    setupSettingsMock();

    render(<SettingsDrawer highScore={50} />);
    await user.click(screen.getByRole('button', { name: /settings/i }));

    const guidance = screen.getAllByText(/Current high score: 50\./i);
    expect(guidance.length).toBeGreaterThan(0);
    guidance.forEach((node) => {
      expect(node).toBeVisible();
    });
  });
});
