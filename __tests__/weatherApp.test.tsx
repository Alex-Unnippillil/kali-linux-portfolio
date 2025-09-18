import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeatherApp from '../apps/weather';
import type { WeatherResponse } from '../apps/weather/providers/types';

type CacheValue = Response;

class CacheMock {
  private store = new Map<string, CacheValue>();

  async match(key: RequestInfo) {
    return this.store.get(String(key)) ?? undefined;
  }

  async put(key: RequestInfo, value: CacheValue) {
    this.store.set(String(key), value);
  }
}

class CacheStorageMock {
  private caches = new Map<string, CacheMock>();

  async open(name: string) {
    if (!this.caches.has(name)) {
      this.caches.set(name, new CacheMock());
    }
    return this.caches.get(name)!;
  }

  clear() {
    this.caches.clear();
  }
}

const cachesMock = new CacheStorageMock();

const createCacheEntry = (data: WeatherResponse): Response => ({
  async json() {
    return JSON.parse(JSON.stringify(data)) as WeatherResponse;
  },
  clone() {
    return createCacheEntry(JSON.parse(JSON.stringify(data)) as WeatherResponse);
  },
}) as unknown as Response;

const setNavigatorOnline = (value: boolean) => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => value,
  });
};

beforeAll(() => {
  Object.defineProperty(global, 'caches', {
    configurable: true,
    value: cachesMock,
  });
});

beforeEach(() => {
  window.localStorage.clear();
  cachesMock.clear();
  setNavigatorOnline(true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const seedCityStorage = () => {
  window.localStorage.setItem(
    'weather-cities',
    JSON.stringify([
      { id: 'test-1', name: 'Test City', lat: 1, lon: 2 },
    ]),
  );
  window.localStorage.setItem('weather-city-groups', JSON.stringify([]));
  window.localStorage.setItem('weather-current-group', JSON.stringify(null));
};

test('switching providers refreshes readings from the new source', async () => {
  seedCityStorage();

  const payload = {
    current_weather: { temperature: 10, weathercode: 2 },
    daily: {
      time: ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'],
      temperature_2m_max: [10, 11, 12, 13, 14],
      weathercode: [1, 2, 3, 4, 5],
    },
  };

  const fetchMock = jest
    .spyOn(global, 'fetch')
    .mockResolvedValue({ ok: true, json: async () => payload } as Response);

  const user = userEvent.setup();
  render(<WeatherApp />);

  await screen.findByText('10°C');

  const select = screen.getByLabelText('Provider');
  await user.selectOptions(select, 'demo');

  await waitFor(() => {
    expect(screen.getByText('13°C')).toBeInTheDocument();
  });

  expect(fetchMock).toHaveBeenCalled();
});

test('serves cached data when offline', async () => {
  seedCityStorage();
  window.localStorage.setItem('weather-provider', JSON.stringify('open-meteo'));

  const cached: WeatherResponse = {
    reading: { temp: 22, condition: 3, time: 123 },
    forecast: [
      { date: '2024-01-01', temp: 22, condition: 3 },
      { date: '2024-01-02', temp: 23, condition: 5 },
      { date: '2024-01-03', temp: 24, condition: 7 },
      { date: '2024-01-04', temp: 25, condition: 9 },
      { date: '2024-01-05', temp: 26, condition: 11 },
    ],
  };

  const cache = await caches.open('weather');
  await cache.put('open-meteo:1:2', createCacheEntry(cached));

  const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() => {
    throw new Error('should not fetch while offline');
  });

  setNavigatorOnline(false);

  render(<WeatherApp />);

  await waitFor(() => {
    expect(screen.getByText('22°C')).toBeInTheDocument();
  });

  expect(fetchMock).not.toHaveBeenCalled();
  expect(
    screen.getByText(/Offline - showing cached data/i),
  ).toBeInTheDocument();
});
