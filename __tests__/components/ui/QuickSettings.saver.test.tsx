import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickSettings from '../../../components/ui/QuickSettings';
import {
  estimateLifeGainMinutes,
  setPowerSaverEnabled,
} from '../../../utils/powerManager';
import { logPowerSaverChange } from '../../../utils/analytics';

jest.mock('../../../utils/powerManager', () => ({
  estimateLifeGainMinutes: jest.fn(() => 95),
  setPowerSaverEnabled: jest.fn(),
}));

jest.mock('../../../utils/analytics', () => ({
  logPowerSaverChange: jest.fn(),
}));

describe('QuickSettings power saver toggle', () => {
  const estimateLifeGainMinutesMock = estimateLifeGainMinutes as jest.Mock;
  const setPowerSaverEnabledMock = setPowerSaverEnabled as jest.Mock;
  const logPowerSaverChangeMock = logPowerSaverChange as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    document.documentElement.style.removeProperty('--power-saver-brightness');
  });

  it('dims the display and logs analytics when toggled', async () => {
    const user = userEvent.setup();
    render(<QuickSettings open />);

    const toggle = screen.getByRole('checkbox', { name: /power saver/i });

    expect(toggle).not.toBeChecked();
    expect(setPowerSaverEnabledMock).toHaveBeenLastCalledWith(false);
    expect(estimateLifeGainMinutesMock).toHaveBeenCalledTimes(1);

    await user.click(toggle);

    await waitFor(() => expect(toggle).toBeChecked());
    await waitFor(() => expect(setPowerSaverEnabledMock).toHaveBeenLastCalledWith(true));
    await waitFor(() =>
      expect(logPowerSaverChangeMock).toHaveBeenLastCalledWith(true, 95),
    );
    expect(
      document.documentElement.style.getPropertyValue('--power-saver-brightness'),
    ).toBe('0.7');

    await user.click(toggle);

    await waitFor(() => expect(setPowerSaverEnabledMock).toHaveBeenLastCalledWith(false));
    await waitFor(() => expect(logPowerSaverChangeMock).toHaveBeenLastCalledWith(false));
    expect(
      document.documentElement.style.getPropertyValue('--power-saver-brightness'),
    ).toBe('1');
  });
});
