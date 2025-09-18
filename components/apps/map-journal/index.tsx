'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import type { LatLngExpression, LatLngLiteral } from 'leaflet';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMapEvent } from 'react-leaflet';

interface MapPin {
  id: string;
  title: string;
  note: string;
  tags: string[];
  lat: number;
  lng: number;
  createdAt: string;
  updatedAt: string;
}

type FormState =
  | {
      mode: 'create';
      title: string;
      note: string;
      tags: string;
    }
  | {
      mode: 'edit';
      pinId: string;
      title: string;
      note: string;
      tags: string;
    };

const INITIAL_CENTER: LatLngExpression = [20, 0];

function getId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `pin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseTags(value: string) {
  const seen = new Set<string>();
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .filter((tag) => {
      const lowered = tag.toLowerCase();
      if (seen.has(lowered)) return false;
      seen.add(lowered);
      return true;
    });
}

function MapClickHandler({
  onClick,
}: {
  onClick: (latlng: LatLngLiteral) => void;
}) {
  useMapEvent('click', (event) => {
    onClick(event.latlng);
  });
  return null;
}

export default function MapJournal() {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingLocation, setPendingLocation] = useState<LatLngLiteral | null>(null);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('');
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedPin = useMemo(
    () => (selectedId ? pins.find((pin) => pin.id === selectedId) ?? null : null),
    [pins, selectedId],
  );

  const filteredPins = useMemo(() => {
    if (!filterTags.length) return pins;
    return pins.filter((pin) => filterTags.every((tag) => pin.tags.includes(tag)));
  }, [pins, filterTags]);

  useEffect(() => {
    if (!selectedPin) {
      setFormState((prev) => (prev?.mode === 'create' ? prev : null));
      return;
    }
    if (filterTags.length && !filterTags.every((tag) => selectedPin.tags.includes(tag))) {
      setSelectedId(null);
      setFormState(null);
      return;
    }
    setFormState((prev) => {
      if (prev?.mode === 'edit' && prev.pinId === selectedPin.id) {
        return prev;
      }
      return {
        mode: 'edit',
        pinId: selectedPin.id,
        title: selectedPin.title,
        note: selectedPin.note,
        tags: selectedPin.tags.join(', '),
      };
    });
  }, [selectedPin, filterTags]);

  useEffect(() => {
    if (!selectedPin || !mapRef.current) return;
    mapRef.current.flyTo([selectedPin.lat, selectedPin.lng], Math.max(mapRef.current.getZoom(), 5), {
      duration: 0.6,
    });
  }, [selectedPin]);

  const allTags = useMemo(() => {
    const values = new Set<string>();
    pins.forEach((pin) => {
      pin.tags.forEach((tag) => values.add(tag));
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [pins]);

  const handleSelectPin = useCallback(
    (pinId: string) => {
      const pin = pins.find((item) => item.id === pinId);
      if (!pin) return;
      setPendingLocation(null);
      setSelectedId(pinId);
      setFormState({
        mode: 'edit',
        pinId,
        title: pin.title,
        note: pin.note,
        tags: pin.tags.join(', '),
      });
      setStatus('');
    },
    [pins],
  );

  const handleAddPin = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!pendingLocation || !formState || formState.mode !== 'create') return;
      const title = formState.title.trim() || `Pin ${pins.length + 1}`;
      const note = formState.note.trim();
      const tags = parseTags(formState.tags);
      const now = new Date().toISOString();
      const id = getId();
      const pin: MapPin = {
        id,
        title,
        note,
        tags,
        lat: pendingLocation.lat,
        lng: pendingLocation.lng,
        createdAt: now,
        updatedAt: now,
      };
      setPins((prev) => [...prev, pin]);
      setSelectedId(id);
      setPendingLocation(null);
      setFormState({
        mode: 'edit',
        pinId: id,
        title,
        note,
        tags: tags.join(', '),
      });
      setStatus('Pin added');
    },
    [formState, pendingLocation, pins.length],
  );

  const handleUpdatePin = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!formState || formState.mode !== 'edit') return;
      const pin = pins.find((item) => item.id === formState.pinId);
      if (!pin) return;
      const title = formState.title.trim() || pin.title;
      const note = formState.note.trim();
      const tags = parseTags(formState.tags);
      const now = new Date().toISOString();
      setPins((prev) =>
        prev.map((item) =>
          item.id === pin.id
            ? { ...item, title, note, tags, updatedAt: now }
            : item,
        ),
      );
      setFormState({
        mode: 'edit',
        pinId: pin.id,
        title,
        note,
        tags: tags.join(', '),
      });
      setStatus('Pin updated');
    },
    [formState, pins],
  );

  const handleDeletePin = useCallback(() => {
    if (!selectedPin) return;
    setPins((prev) => prev.filter((pin) => pin.id !== selectedPin.id));
    setSelectedId(null);
    setFormState(null);
    setPendingLocation(null);
    setStatus('Pin removed');
  }, [selectedPin]);

  const toggleFilterTag = useCallback((tag: string) => {
    setFilterTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
    );
  }, []);

  const clearFilters = useCallback(() => setFilterTags([]), []);

  const handleMapClick = useCallback((latlng: LatLngLiteral) => {
    setPendingLocation(latlng);
    setSelectedId(null);
    setFormState({ mode: 'create', title: '', note: '', tags: '' });
    setStatus(`Preparing new pin at ${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
  }, []);

  const focusListItem = useCallback((index: number) => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    node?.focus();
  }, []);

  const handleItemKeyDown = useCallback(
    (event: KeyboardEvent<HTMLLIElement>, index: number, pinId: string) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const next = (index + 1) % filteredPins.length;
        focusListItem(next);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const prev = (index - 1 + filteredPins.length) % filteredPins.length;
        focusListItem(prev);
      } else if (event.key === 'Home') {
        event.preventDefault();
        focusListItem(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        focusListItem(filteredPins.length - 1);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelectPin(pinId);
      }
    },
    [filteredPins.length, focusListItem, handleSelectPin],
  );

  const exportPins = useCallback(() => {
    const featureCollection = {
      type: 'FeatureCollection',
      features: pins.map((pin) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [pin.lng, pin.lat],
        },
        properties: {
          id: pin.id,
          title: pin.title,
          note: pin.note,
          tags: pin.tags,
          createdAt: pin.createdAt,
          updatedAt: pin.updatedAt,
        },
      })),
    } as const;
    const blob = new Blob([JSON.stringify(featureCollection, null, 2)], {
      type: 'application/geo+json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'map-journal.geojson';
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('Exported GeoJSON');
  }, [pins]);

  const handleImport = useCallback(async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (json.type !== 'FeatureCollection' || !Array.isArray(json.features)) {
        throw new Error('Invalid GeoJSON structure');
      }
      const importedPins: MapPin[] = [];
      for (const feature of json.features) {
        if (!feature || feature.type !== 'Feature') continue;
        if (!feature.geometry || feature.geometry.type !== 'Point') continue;
        const coords = feature.geometry.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) continue;
        const [lng, lat] = coords;
        if (typeof lat !== 'number' || typeof lng !== 'number') continue;
        const properties = feature.properties ?? {};
        const id = typeof properties.id === 'string' ? properties.id : getId();
        const title = typeof properties.title === 'string' ? properties.title : 'Imported pin';
        const note = typeof properties.note === 'string' ? properties.note : '';
        const tags = Array.isArray(properties.tags)
          ? properties.tags.filter((tag: unknown): tag is string => typeof tag === 'string')
          : [];
        const createdAt =
          typeof properties.createdAt === 'string' ? properties.createdAt : new Date().toISOString();
        const updatedAt =
          typeof properties.updatedAt === 'string' ? properties.updatedAt : createdAt;
        importedPins.push({ id, title, note, tags, lat, lng, createdAt, updatedAt });
      }
      if (!importedPins.length) {
        throw new Error('No valid features found');
      }
      setPins((prev) => {
        const map = new Map(prev.map((pin) => [pin.id, pin] as const));
        importedPins.forEach((pin) => {
          map.set(pin.id, pin);
        });
        return Array.from(map.values());
      });
      setSelectedId(importedPins[0]?.id ?? null);
      setFormState(null);
      setPendingLocation(null);
      setStatus(`Imported ${importedPins.length} pins`);
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : 'Failed to import GeoJSON');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  const filteredEmpty = filteredPins.length === 0;

  return (
    <div className="flex h-full bg-ub-cool-grey text-white">
      <div className="relative flex-1 min-h-[320px]">
        <MapContainer
          center={INITIAL_CENTER}
          zoom={3}
          minZoom={2}
          className="h-full w-full"
          scrollWheelZoom
          whenCreated={(map) => {
            mapRef.current = map;
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onClick={handleMapClick} />
          {filteredPins.map((pin) => (
            <CircleMarker
              key={pin.id}
              center={[pin.lat, pin.lng]}
              pathOptions={{
                color: pin.id === selectedId ? '#93c5fd' : '#fbbf24',
                fillColor: pin.id === selectedId ? '#60a5fa' : '#facc15',
                fillOpacity: 0.8,
                weight: pin.id === selectedId ? 4 : 2,
              }}
              radius={pin.id === selectedId ? 10 : 8}
              eventHandlers={{
                click: () => handleSelectPin(pin.id),
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
                <span className="text-xs font-semibold">{pin.title}</span>
              </Tooltip>
              <Popup>
                <div className="space-y-1 text-sm">
                  <div className="font-semibold">{pin.title}</div>
                  {pin.note && <p className="max-w-xs whitespace-pre-wrap break-words">{pin.note}</p>}
                  {pin.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {pin.tags.map((tag) => (
                        <span key={tag} className="rounded bg-blue-600/20 px-1.5 py-0.5 text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-[11px] text-gray-300">
                    {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectPin(pin.id)}
                    className="mt-2 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500"
                  >
                    Edit details
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          ))}
          {pendingLocation && (
            <CircleMarker
              center={[pendingLocation.lat, pendingLocation.lng]}
              pathOptions={{ color: '#f472b6', dashArray: '4 4', fillColor: '#fbcfe8', fillOpacity: 0.4 }}
              radius={9}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
                <span className="text-xs font-semibold">New pin</span>
              </Tooltip>
            </CircleMarker>
          )}
        </MapContainer>
        <div className="pointer-events-none absolute left-4 top-4 rounded bg-black/60 px-3 py-2 text-xs backdrop-blur">
          <p className="font-semibold">Add pins with a map click.</p>
          <p>Selections sync with the list for keyboard review.</p>
        </div>
      </div>
      <aside className="w-full max-w-md border-l border-white/10 bg-black/40 px-4 py-6 backdrop-blur overflow-y-auto">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportPins}
            className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium hover:bg-emerald-500"
          >
            Export GeoJSON
          </button>
          <label className="inline-flex items-center gap-2 text-sm">
            <span className="sr-only">Import GeoJSON</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/geo+json,application/json,.geojson"
              className="hidden"
              onChange={handleImport}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded bg-sky-600 px-3 py-1 font-medium hover:bg-sky-500"
            >
              Import GeoJSON
            </button>
          </label>
          <div aria-live="polite" role="status" className="text-xs text-gray-200">
            {status}
          </div>
        </div>

        <section aria-labelledby="tag-filter-heading" className="mb-6">
          <div className="flex items-center justify-between">
            <h2 id="tag-filter-heading" className="text-sm font-semibold uppercase tracking-wide text-gray-200">
              Filter by tag
            </h2>
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-sky-300 hover:text-sky-200"
            >
              Clear
            </button>
          </div>
          {allTags.length === 0 ? (
            <p className="mt-2 text-xs text-gray-300">Pins will surface their tags here.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {allTags.map((tag) => {
                const active = filterTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleFilterTag(tag)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      active ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-200 hover:bg-white/20'
                    }`}
                    aria-pressed={active}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section aria-labelledby="pin-list-heading" className="mb-6">
          <h2 id="pin-list-heading" className="text-sm font-semibold uppercase tracking-wide text-gray-200">
            Pins
          </h2>
          {filteredEmpty ? (
            <p className="mt-2 text-xs text-gray-300">
              {pins.length === 0
                ? 'Click anywhere on the map to start your journal.'
                : 'No pins match the current tag filters.'}
            </p>
          ) : (
            <ul
              ref={listRef}
              role="listbox"
              aria-label="Saved pins"
              className="mt-2 space-y-2"
            >
              {filteredPins.map((pin, index) => {
                const active = pin.id === selectedId;
                return (
                  <li
                    key={pin.id}
                    data-index={index}
                    role="option"
                    tabIndex={0}
                    aria-selected={active}
                    onKeyDown={(event) => handleItemKeyDown(event, index, pin.id)}
                    onClick={() => handleSelectPin(pin.id)}
                    className={`cursor-pointer rounded border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-400 ${
                      active ? 'border-blue-400 bg-blue-500/20' : 'border-white/10 bg-black/30 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{pin.title}</span>
                      <span className="text-[11px] text-gray-300">
                        {pin.lat.toFixed(2)}, {pin.lng.toFixed(2)}
                      </span>
                    </div>
                    {pin.note && (
                      <p className="mt-1 line-clamp-2 text-xs text-gray-200">{pin.note}</p>
                    )}
                    {pin.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {pin.tags.map((tag) => (
                          <span key={tag} className="rounded bg-white/10 px-2 py-0.5 text-[11px]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {formState && formState.mode === 'create' && pendingLocation && (
          <form onSubmit={handleAddPin} className="space-y-3" aria-labelledby="new-pin-heading">
            <h2 id="new-pin-heading" className="text-sm font-semibold uppercase tracking-wide text-gray-200">
              New pin
            </h2>
            <p className="text-xs text-gray-300">
              {pendingLocation.lat.toFixed(4)}, {pendingLocation.lng.toFixed(4)}
            </p>
            <label className="block text-sm font-medium">
              Title
              <input
                value={formState.title}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev && prev.mode === 'create'
                      ? { ...prev, title: event.target.value }
                      : prev,
                  )
                }
                className="mt-1 w-full rounded bg-white/10 px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Observation"
              />
            </label>
            <label className="block text-sm font-medium">
              Notes
              <textarea
                value={formState.note}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev && prev.mode === 'create'
                      ? { ...prev, note: event.target.value }
                      : prev,
                  )
                }
                className="mt-1 h-24 w-full rounded bg-white/10 px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="What did you find?"
              />
            </label>
            <label className="block text-sm font-medium">
              Tags
              <input
                value={formState.tags}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev && prev.mode === 'create'
                      ? { ...prev, tags: event.target.value }
                      : prev,
                  )
                }
                className="mt-1 w-full rounded bg-white/10 px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Comma separated"
              />
            </label>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="rounded bg-blue-600 px-3 py-1 text-sm font-medium hover:bg-blue-500"
              >
                Save pin
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormState(null);
                  setPendingLocation(null);
                  setStatus('New pin cancelled');
                }}
                className="text-sm text-gray-300 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {formState && formState.mode === 'edit' && selectedPin && (
          <form onSubmit={handleUpdatePin} className="space-y-3" aria-labelledby="edit-pin-heading">
            <h2 id="edit-pin-heading" className="text-sm font-semibold uppercase tracking-wide text-gray-200">
              Edit pin
            </h2>
            <p className="text-xs text-gray-300">
              {selectedPin.lat.toFixed(4)}, {selectedPin.lng.toFixed(4)}
            </p>
            <label className="block text-sm font-medium">
              Title
              <input
                value={formState.title}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev && prev.mode === 'edit'
                      ? { ...prev, title: event.target.value }
                      : prev,
                  )
                }
                className="mt-1 w-full rounded bg-white/10 px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>
            <label className="block text-sm font-medium">
              Notes
              <textarea
                value={formState.note}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev && prev.mode === 'edit'
                      ? { ...prev, note: event.target.value }
                      : prev,
                  )
                }
                className="mt-1 h-24 w-full rounded bg-white/10 px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>
            <label className="block text-sm font-medium">
              Tags
              <input
                value={formState.tags}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev && prev.mode === 'edit'
                      ? { ...prev, tags: event.target.value }
                      : prev,
                  )
                }
                className="mt-1 w-full rounded bg-white/10 px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="rounded bg-blue-600 px-3 py-1 text-sm font-medium hover:bg-blue-500"
              >
                Save changes
              </button>
              <button
                type="button"
                onClick={handleDeletePin}
                className="rounded bg-red-600 px-3 py-1 text-sm font-medium hover:bg-red-500"
              >
                Delete pin
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              Last updated {new Date(selectedPin.updatedAt).toLocaleString()}
            </p>
          </form>
        )}
      </aside>
    </div>
  );
}
