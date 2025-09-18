'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import useWeatherState, {
  City,
  ForecastDay,
  useWeatherGroups,
  useCurrentGroup,
  useGeolocationOptOut,
  useLastLocation,
  useManualCityEntry,
} from './state';
import Forecast from './components/Forecast';
import CityDetail from './components/CityDetail';

interface ReadingUpdate {
  temp: number;
  condition: number;
  time: number;
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
  const [manualEntry, setManualEntry] = useManualCityEntry();
  const [optOut, setOptOut] = useGeolocationOptOut();
  const [lastLocation, setLastLocation] = useLastLocation();
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [groupName, setGroupName] = useState('');
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  const [selected, setSelected] = useState<City | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [geoPending, setGeoPending] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const dragSrc = useRef<number | null>(null);
  const autoRequest = useRef(false);

  const addOrUpdateLocation = useCallback(
    (city: City) => {
      setLastLocation(city);
      setCities((prev) => {
        const idx = prev.findIndex((c) => c.id === city.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...city };
          return next;
        }
        return [city, ...prev];
      });
    },
    [setCities, setLastLocation],
  );

  const requestGeolocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError('Geolocation is not supported in this environment.');
      setGeoPending(false);
      return;
    }
    setGeoPending(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude, longitude } = coords;
        addOrUpdateLocation({
          id: 'last-location',
          name: 'Current Location',
          lat: latitude,
          lon: longitude,
        });
        setOptOut(false);
        setShowLocationModal(false);
        setGeoPending(false);
      },
      (err) => {
        setLocationError(err?.message || 'Unable to retrieve your location.');
        setGeoPending(false);
      },
    );
  }, [
    addOrUpdateLocation,
    setGeoPending,
    setLocationError,
    setOptOut,
    setShowLocationModal,
  ]);

  const onManualChange = (field: 'name' | 'lat' | 'lon') =>
    (event: ChangeEvent<HTMLInputElement>) =>
      setManualEntry((prev) => ({ ...prev, [field]: event.target.value }));

  const saveManualLocation = () => {
    const manualName = manualEntry.name.trim() || 'Manual Location';
    const latValue = manualEntry.lat.trim();
    const lonValue = manualEntry.lon.trim();
    const latNum = parseFloat(latValue);
    const lonNum = parseFloat(lonValue);
    if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
      setLocationError('Enter a valid latitude and longitude.');
      return;
    }
    setManualEntry({ name: manualName, lat: latValue, lon: lonValue });
    addOrUpdateLocation({
      id: 'last-location',
      name: manualName,
      lat: latNum,
      lon: lonNum,
    });
    setLocationError(null);
    setShowLocationModal(false);
  };

  useEffect(() => {
    if (!currentGroup) return;
    const group = groups.find((g) => g.name === currentGroup);
    if (group) setCities(group.cities);
  }, [currentGroup, groups, setCities]);

  useEffect(() => {
    if (!lastLocation) return;
    setCities((prev) => {
      const exists = prev.some((city) => city.id === lastLocation.id);
      if (exists) {
        return prev.map((city) =>
          city.id === lastLocation.id ? { ...city, ...lastLocation } : city,
        );
      }
      return [lastLocation, ...prev];
    });
  }, [lastLocation, setCities]);

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
    if (!lastLocation && !optOut) {
      setShowLocationModal(true);
    }
  }, [lastLocation, optOut]);

  useEffect(() => {
    if (!showLocationModal) {
      autoRequest.current = false;
      return;
    }
    if (!optOut && !autoRequest.current) {
      autoRequest.current = true;
      requestGeolocation();
    }
  }, [optOut, requestGeolocation, showLocationModal]);

  const addCity = () => {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (!name || Number.isNaN(latNum) || Number.isNaN(lonNum)) return;
    setCities([
      ...cities,
      { id: `${name}-${lat}-${lon}`, name, lat: latNum, lon: lonNum },
    ]);
    setName('');
    setLat('');
    setLon('');
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

  return (
    <div className="p-4 text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm opacity-80">
          {lastLocation
            ? `Last location: ${lastLocation.name} (${lastLocation.lat.toFixed(2)}, ${lastLocation.lon.toFixed(2)})`
            : 'No location selected'}
        </div>
        <button
          className="bg-blue-600 px-2 rounded"
          onClick={() => {
            setShowLocationModal(true);
            setLocationError(null);
          }}
        >
          Set Location
        </button>
      </div>
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
      <div className="flex gap-2 mb-4">
        <input
          className="text-black px-1"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
      </div>
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
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-neutral-900 p-4 rounded w-full max-w-md text-white">
            <div className="flex justify-between items-start gap-4 mb-2">
              <h2 className="font-bold text-lg">Location Access</h2>
              <button onClick={() => setShowLocationModal(false)} className="px-1.5">
                Close
              </button>
            </div>
            <p className="text-sm opacity-80 mb-3">
              Allow the weather app to use your current location or enter a city manually.
            </p>
            {locationError && (
              <div className="mb-3 text-sm text-red-400" role="alert">
                {locationError}
              </div>
            )}
            <div className="flex flex-col gap-2 mb-4">
              <button
                className="bg-blue-600 px-2 py-1 rounded disabled:opacity-60"
                onClick={requestGeolocation}
                disabled={geoPending}
              >
                {geoPending ? 'Locating…' : 'Use my current location'}
              </button>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={optOut}
                  onChange={(e) => setOptOut(e.target.checked)}
                />
                Skip automatic geolocation prompts
              </label>
            </div>
            <div className="mb-4">
              <div className="font-semibold mb-2">Manual city</div>
              <input
                className="text-black px-1 w-full mb-2"
                placeholder="City name"
                value={manualEntry.name}
                onChange={onManualChange('name')}
              />
              <div className="flex gap-2 mb-2">
                <input
                  className="text-black px-1 w-full"
                  placeholder="Latitude"
                  value={manualEntry.lat}
                  onChange={onManualChange('lat')}
                />
                <input
                  className="text-black px-1 w-full"
                  placeholder="Longitude"
                  value={manualEntry.lon}
                  onChange={onManualChange('lon')}
                />
              </div>
              <button className="bg-white/20 px-2 py-1 rounded" onClick={saveManualLocation}>
                Save manual location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

