import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('next/script', () => (props: any) => <>{props.children}</>);
jest.mock('dompurify', () => ({ sanitize: (html: string) => html }));
jest.mock('html-to-image', () => ({
  toPng: jest.fn(() => Promise.resolve('data:image/png;base64,')),
}));
jest.mock('../utils/share', () => ({
  __esModule: true,
  default: jest.fn(),
  canShare: jest.fn(() => false),
}));
jest.mock('../apps/quote/components/PlaylistBuilder', () => () => null);
jest.mock('../apps/quote/components/Posterizer', () => () => null);
jest.mock('../public/quotes/quotes.json', () => [], { virtual: true });
jest.mock('bad-words', () => {
  return {
    __esModule: true,
    default: class Filter {
      isProfane() {
        return false;
      }
    },
  };
});
jest.mock('../apps/weather/state');
jest.mock('../hooks/usePersistentState');
jest.mock('../lib/fetchProxy', () => ({
  getActiveFetches: jest.fn(() => []),
  onFetchProxy: jest.fn(() => () => {}),
}));
jest.mock('../apps/resource-monitor/export', () => ({
  exportMetrics: jest.fn(),
}));

import WeatherApp from '../apps/weather';
import NetworkInsights from '../apps/resource-monitor/components/NetworkInsights';
import QuoteApp from '../apps/quote';
import useWeatherState, {
  useWeatherGroups,
  useCurrentGroup,
} from '../apps/weather/state';
import usePersistentState from '../hooks/usePersistentState';
import { getEmptyStateCopy } from '../modules/emptyStates';

const mockUseWeatherState = useWeatherState as unknown as jest.Mock;
const mockUseWeatherGroups = useWeatherGroups as unknown as jest.Mock;
const mockUseCurrentGroup = useCurrentGroup as unknown as jest.Mock;
const mockUsePersistentState = usePersistentState as unknown as jest.Mock;
const persistentStateSetters: jest.Mock[] = [];

mockUsePersistentState.mockImplementation((key: string, initial: any) => {
  const initialValue = typeof initial === 'function' ? initial() : initial;
  const setter = jest.fn();
  persistentStateSetters.push(setter);
  return [initialValue, setter, jest.fn(), jest.fn()];
});

describe('App empty state acceptance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    persistentStateSetters.length = 0;
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')));
  });

  it('shows weather empty state with sample action and docs', () => {
    const setCities = jest.fn();
    mockUseWeatherState.mockReturnValueOnce([
      [],
      setCities,
      jest.fn(),
      jest.fn(),
    ]);
    mockUseWeatherGroups.mockReturnValueOnce([
      [],
      jest.fn(),
      jest.fn(),
      jest.fn(),
    ]);
    mockUseCurrentGroup.mockReturnValueOnce([
      null,
      jest.fn(),
      jest.fn(),
      jest.fn(),
    ]);

    const weatherCopy = getEmptyStateCopy('weather-no-cities');
    render(<WeatherApp />);

    expect(screen.getByText(weatherCopy.title)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: weatherCopy.primaryActionLabel }),
    );
    expect(setCities).toHaveBeenCalled();
    expect(
      screen.getByRole('link', { name: weatherCopy.documentation.label }),
    ).toBeInTheDocument();
  });

  it('renders network insights empty states and runs demo request', async () => {
    const activeCopy = getEmptyStateCopy('resource-monitor-active-empty');
    const historyCopy = getEmptyStateCopy('resource-monitor-history-empty');

    render(<NetworkInsights />);

    const setHistory = persistentStateSetters[0];

    expect(screen.getByText(activeCopy.title)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: activeCopy.documentation.label }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getAllByRole('button', { name: activeCopy.primaryActionLabel })[0],
    );
    await waitFor(() => {
      expect(setHistory).toHaveBeenCalled();
    });
    expect(
      screen.getByRole('link', { name: historyCopy.documentation.label }),
    ).toBeInTheDocument();
  });

  it('surfaces quote empty state with reset and docs', () => {
    const quoteCopy = getEmptyStateCopy('quote-no-results');
    render(<QuoteApp />);

    expect(screen.getByText(quoteCopy.title)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: quoteCopy.primaryActionLabel }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: quoteCopy.documentation.label }),
    ).toBeInTheDocument();
    if (quoteCopy.secondaryDocumentation) {
      expect(
        screen.getByRole('link', {
          name: quoteCopy.secondaryDocumentation.label,
        }),
      ).toBeInTheDocument();
    }
  });
});
