'use client';

import { useEffect, useRef, useState } from 'react';
import useWeatherState, {
  City,
  ForecastDay,
  useWeatherGroups,
  useCurrentGroup,
} from './state';
import Forecast from './components/Forecast';
import CityDetail from './components/CityDetail';

interface ReadingUpdate {
  temp: number;
  condition: number;
  time: number;
}

interface Suggestion {
  id: string;
  title: string;
  subtitle?: string;
  fullLabel: string;
  lat: number;
  lon: number;
}

type HelperTone = 'info' | 'error' | 'success';

interface HelperMessage {
  tone: HelperTone;
  message: string;
}

function CityTile({ city }: { city: City }) {
  return (
    <div>
      <div className="font-bold mb-1.5">{city.name}</div>
      {city.lastReading ? (
        <div className="mb-1.5">{Math.round(city.lastReading.temp)}°C</div>
      ) : (
        <div className="opacity-70 mb-1.5">No data</div>
      )}
      {city.forecast && <Forecast days={city.forecast.slice(0, 5)} />}
    </div>
  );
}

export default function WeatherApp() {
  const [cities, setCities] = useWeatherState();
  const [groups, setGroups] = useWeatherGroups();
  const [currentGroup, setCurrentGroup] = useCurrentGroup();
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [groupName, setGroupName] = useState('');
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  const [selected, setSelected] = useState<City | null>(null);
  const dragSrc = useRef<number | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const skipNextSearch = useRef(false);
  const [helper, setHelper] = useState<HelperMessage | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    if (!currentGroup) return;
    const group = groups.find((g) => g.name === currentGroup);
    if (group) setCities(group.cities);
  }, [currentGroup, groups, setCities]);

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (offline) return;
    cities.forEach((city, i) => {
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true&daily=weathercode,temperature_2m_max&forecast_days=5&timezone=auto`,
      )
        .then((res) => res.json())
        .then((data) => {
          const reading: ReadingUpdate = {
            temp: data.current_weather.temperature,
            condition: data.current_weather.weathercode,
            time: Date.now(),
          };
          const forecast: ForecastDay[] = data.daily.time.map(
            (date: string, idx: number) => ({
              date,
              temp: data.daily.temperature_2m_max[idx],
              condition: data.daily.weathercode[idx],
            }),
          );
          setCities((prev) => {
            const next = [...prev];
            if (!next[i]) return prev;
            next[i] = { ...next[i], lastReading: reading, forecast };
            return next;
          });
        })
        .catch(() => {
          // ignore fetch errors
        });
    });
  }, [offline, cities, setCities]);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      setIsSearching(false);
      return;
    }

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setSuggestions([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    if (trimmed.length < 3) {
      setSuggestions([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    if (offline) {
      setSuggestions([]);
      setIsSearching(false);
      setSearchError(
        'Search is unavailable while offline. Enter coordinates manually.',
      );
      return;
    }

    let canceled = false;
    const controller = new AbortController();
    setIsSearching(true);
    setSearchError(null);

    const timeout = window.setTimeout(() => {
      fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          trimmed,
        )}&count=5&language=en&format=json`,
        { signal: controller.signal },
      )
        .then((res) => {
          if (!res.ok) throw new Error('search_failed');
          return res.json();
        })
        .then((data) => {
          if (canceled || controller.signal.aborted) return;
          const results: Suggestion[] = Array.isArray(data?.results)
            ? data.results.map((item: any) => {
                const subtitleParts = [item.admin1, item.country]
                  .filter((part) => typeof part === 'string' && part.length)
                  .map((part) => part as string);
                const fullLabel = subtitleParts.length
                  ? `${item.name}, ${subtitleParts.join(', ')}`
                  : String(item.name);
                return {
                  id: String(item.id ?? `${item.latitude}-${item.longitude}`),
                  title: String(item.name ?? ''),
                  subtitle: subtitleParts.join(', ') || undefined,
                  fullLabel,
                  lat: Number(item.latitude),
                  lon: Number(item.longitude),
                };
              })
            : [];
          setSuggestions(results);
          if (!results.length) {
            setSearchError(
              `No matches found for “${trimmed}”. Try adjusting your search or enter coordinates manually.`,
            );
          }
        })
        .catch((err) => {
          if (canceled || controller.signal.aborted) return;
          console.error(err);
          setSuggestions([]);
          setSearchError(
            'Unable to fetch suggestions right now. Try again later or enter coordinates manually.',
          );
        })
        .finally(() => {
          if (!canceled && !controller.signal.aborted) {
            setIsSearching(false);
          }
        });
    }, 300);

    return () => {
      canceled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [name, offline]);

  const addCity = () => {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (!name || Number.isNaN(latNum) || Number.isNaN(lonNum)) {
      setHelper({
        tone: 'error',
        message: 'Enter a name, latitude, and longitude to add a city.',
      });
      return;
    }
    setCities((prev) => [
      ...prev,
      { id: `${name}-${lat}-${lon}`, name, lat: latNum, lon: lonNum },
    ]);
    setName('');
    setLat('');
    setLon('');
    setSuggestions([]);
    setSearchError(null);
    setHelper({
      tone: 'success',
      message: `${name} saved. Fetching the latest weather…`,
    });
  };

  const onDragStart = (i: number) => {
    dragSrc.current = i;
  };

  const onDrop = (i: number) => {
    const src = dragSrc.current;
    dragSrc.current = null;
    if (src === null || src === i) return;
    setCities((prev) => {
      const next = [...prev];
      const [moved] = next.splice(src, 1);
      next.splice(i, 0, moved);
      return next;
    });
  };

  const saveGroup = () => {
    if (!groupName) return;
    const idx = groups.findIndex((g) => g.name === groupName);
    const next = [...groups];
    const data = { name: groupName, cities };
    if (idx >= 0) next[idx] = data;
    else next.push(data);
    setGroups(next);
    setCurrentGroup(groupName);
  };

  const switchGroup = (name: string) => {
    const group = groups.find((g) => g.name === name);
    if (group) {
      setCities(group.cities);
      setCurrentGroup(name);
    }
  };

  const useMyLocation = () => {
    if (geoLoading) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setHelper({
        tone: 'error',
        message:
          'Geolocation is not supported in this browser. Search for a city instead.',
      });
      return;
    }

    setGeoLoading(true);
    setHelper({
      tone: 'info',
      message: 'Requesting permission to access your location…',
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const latStr = latitude.toFixed(4);
        const lonStr = longitude.toFixed(4);
        setLat(latStr);
        setLon(lonStr);
        setSuggestions([]);
        setSearchError(null);
        skipNextSearch.current = true;

        if (offline) {
          setName('My location');
          setHelper({
            tone: 'info',
            message:
              'Coordinates captured. Name this location and click Add to save it.',
          });
          setGeoLoading(false);
          return;
        }

        void (async () => {
          try {
            const res = await fetch(
              `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`,
            );
            if (!res.ok) throw new Error('reverse_failed');
            const data = await res.json();
            const first = Array.isArray(data?.results)
              ? data.results[0]
              : null;
            const subtitleParts = [first?.admin1, first?.country]
              .filter((part) => typeof part === 'string' && part.length)
              .map((part) => part as string);
            const label = first?.name
              ? subtitleParts.length
                ? `${first.name}, ${subtitleParts.join(', ')}`
                : String(first.name)
              : `Lat ${latStr}, Lon ${lonStr}`;
            setName(label);
            setHelper({
              tone: 'success',
              message: `Located ${label}. Click Add to save it to your dashboard.`,
            });
          } catch (err) {
            console.error(err);
            setName('My location');
            setHelper({
              tone: 'info',
              message:
                'Coordinates captured. We could not determine the nearest city—add a name and click Add.',
            });
          } finally {
            setGeoLoading(false);
          }
        })();
      },
      (error) => {
        setGeoLoading(false);
        let message =
          'We could not access your location. Try again later or search for a city.';
        switch (error.code) {
          case 1:
            message =
              'Location access was denied. Update your browser permissions or add a city manually.';
            break;
          case 2:
            message =
              'We could not determine your position. Try again or search for a city.';
            break;
          case 3:
            message = 'The location request timed out. Try again or search for a city.';
            break;
          default:
            break;
        }
        setHelper({ tone: 'error', message });
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  return (
    <div className="p-4 text-white">
      <div className="flex gap-2 mb-4">
        <input
          className="text-black px-1"
          placeholder="Group"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />
        <button className="bg-blue-600 px-2 rounded" onClick={saveGroup}>
          Save Group
        </button>
        {groups.map((g) => (
          <button
            key={g.name}
            className={`px-2 rounded ${
              currentGroup === g.name ? 'bg-blue-800' : 'bg-white/20'
            }`}
            onClick={() => switchGroup(g.name)}
          >
            {g.name}
          </button>
        ))}
      </div>
      <p className="mb-2 text-sm text-white/70">
        Type a city name (3+ letters) to search or enter coordinates manually.
        We only request your location when you choose “Use my location”.
      </p>
      <div className="flex flex-wrap gap-2 mb-2 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <input
            className="text-black px-1 w-full"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {(isSearching || suggestions.length > 0) && (
            <div className="absolute z-20 mt-1 w-full rounded border border-white/10 bg-neutral-900/95 shadow-lg max-h-56 overflow-y-auto">
              {isSearching && (
                <div className="px-2 py-1 text-sm text-white/70">
                  Searching…
                </div>
              )}
              {!isSearching &&
                suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className="block w-full px-2 py-1 text-left text-sm hover:bg-white/10"
                    onClick={() => {
                      skipNextSearch.current = true;
                      setName(suggestion.fullLabel);
                      setLat(suggestion.lat.toFixed(4));
                      setLon(suggestion.lon.toFixed(4));
                      setSuggestions([]);
                      setSearchError(null);
                    }}
                  >
                    <div className="font-medium">{suggestion.title}</div>
                    {suggestion.subtitle && (
                      <div className="text-xs text-white/70">
                        {suggestion.subtitle}
                      </div>
                    )}
                  </button>
                ))}
            </div>
          )}
        </div>
        <input
          className="text-black px-1 w-20"
          placeholder="Lat"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
        />
        <input
          className="text-black px-1 w-20"
          placeholder="Lon"
          value={lon}
          onChange={(e) => setLon(e.target.value)}
        />
        <button className="bg-blue-600 px-2 rounded" onClick={addCity}>
          Add
        </button>
        <button
          className={`px-2 rounded border border-white/20 ${
            geoLoading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/10'
          }`}
          onClick={useMyLocation}
          disabled={geoLoading}
        >
          {geoLoading ? 'Locating…' : 'Use my location'}
        </button>
      </div>
      {searchError && (
        <div className="mb-2 text-sm text-red-300">{searchError}</div>
      )}
      {helper && (
        <div
          className={`mb-4 text-sm ${
            helper.tone === 'error'
              ? 'text-red-300'
              : helper.tone === 'success'
              ? 'text-green-300'
              : 'text-blue-200'
          }`}
        >
          {helper.message}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        {cities.map((city, i) => (
          <div
            key={city.id}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(i)}
            onClick={() => setSelected(city)}
            className="bg-white/10 p-4 rounded cursor-pointer"
          >
            <CityTile city={city} />
          </div>
        ))}
      </div>
      {offline && (
        <div className="mt-4 text-sm">Offline - showing cached data</div>
      )}
      {selected && (
        <CityDetail city={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

