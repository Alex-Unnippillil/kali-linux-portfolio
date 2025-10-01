import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Forecast from '../apps/weather/components/Forecast';
import UnitsPanel from '../components/apps/settings/UnitsPanel';
import Clock from '../components/util-components/clock';
import { SettingsProvider } from '../hooks/useSettings';

const renderWithSettings = (ui: React.ReactNode) =>
  render(<SettingsProvider>{ui}</SettingsProvider>);

describe('unit preference propagation', () => {
  beforeAll(() => {
    // Ensure worker-based timers fall back to setInterval in tests
    // @ts-ignore
    global.Worker = undefined;
    const storage: Record<string, string> = {};
    Object.defineProperty(window, 'localStorage', {
      writable: true,
      value: {
        getItem: (key: string) => (key in storage ? storage[key] : null),
        setItem: (key: string, value: string) => {
          storage[key] = value;
        },
        removeItem: (key: string) => {
          delete storage[key];
        },
        clear: () => {
          Object.keys(storage).forEach((k) => delete storage[k]);
        },
        key: (index: number) => Object.keys(storage)[index] ?? null,
        get length() {
          return Object.keys(storage).length;
        },
      },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('forecast updates when switching measurement system', async () => {
    renderWithSettings(
      <>
        <UnitsPanel />
        <Forecast
          days={[
            { date: '2024-01-01', temp: 10, condition: 0 },
            { date: '2024-01-02', temp: 8, condition: 0 },
          ]}
        />
      </>,
    );

    expect(await screen.findByText('10°C')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Imperial/i));

    await waitFor(() => {
      expect(screen.getByText('50°F')).toBeInTheDocument();
    });
  });

  test('clock follows selected time format', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T13:30:00'));

    renderWithSettings(
      <>
        <UnitsPanel />
        <Clock onlyTime={true} />
      </>,
    );

    expect(await screen.findByText(/13:30/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/12-hour clock/i));

    await waitFor(() => {
      const twelveHour = screen.getByText((content) => /1:?30/i.test(content));
      expect(/pm/i.test(twelveHour.textContent || '')).toBe(true);
    });
  });
});
