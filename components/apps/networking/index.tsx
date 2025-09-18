import React, { useEffect, useMemo, useReducer, useState } from 'react';
import Toast from '../../ui/Toast';
import {
  applyAdapterConfig,
  createEmptyRoute,
  loadNetworkAdapters,
  type NetworkAdapter,
  type RouteEntry,
} from '../../../utils/networkState';

export type NetworkingState = {
  adapters: NetworkAdapter[];
  selectedAdapterId: string;
  pendingAdapter?: string;
};

export type NetworkingAction =
  | { type: 'setAdapters'; adapters: NetworkAdapter[] }
  | { type: 'selectAdapter'; adapterId: string }
  | { type: 'updateRoute'; adapterId: string; routeId: string; field: keyof Omit<RouteEntry, 'id'>; value: string }
  | { type: 'addRoute'; adapterId: string }
  | { type: 'removeRoute'; adapterId: string; routeId: string }
  | { type: 'setSearchDomain'; adapterId: string; index: number; value: string }
  | { type: 'addSearchDomain'; adapterId: string }
  | { type: 'removeSearchDomain'; adapterId: string; index: number }
  | { type: 'setPending'; adapterId?: string }
  | { type: 'replaceAdapter'; adapter: NetworkAdapter };

export const initialNetworkingState: NetworkingState = {
  adapters: [],
  selectedAdapterId: '',
  pendingAdapter: undefined,
};

const updateAdapters = (
  adapters: NetworkAdapter[],
  adapterId: string,
  updater: (adapter: NetworkAdapter) => NetworkAdapter
) => adapters.map((adapter) => (adapter.id === adapterId ? updater(adapter) : adapter));

export const networkingReducer = (
  state: NetworkingState,
  action: NetworkingAction
): NetworkingState => {
  switch (action.type) {
    case 'setAdapters': {
      const selectedAdapterId = action.adapters.length
        ? action.adapters.find((adapter) => adapter.id === state.selectedAdapterId)?.id ?? action.adapters[0].id
        : '';
      return {
        ...state,
        adapters: action.adapters,
        selectedAdapterId,
      };
    }
    case 'selectAdapter':
      return {
        ...state,
        selectedAdapterId: action.adapterId,
      };
    case 'updateRoute':
      return {
        ...state,
        adapters: updateAdapters(state.adapters, action.adapterId, (adapter) => ({
          ...adapter,
          routes: adapter.routes.map((route) =>
            route.id === action.routeId ? { ...route, [action.field]: action.value } : route
          ),
        })),
      };
    case 'addRoute':
      return {
        ...state,
        adapters: updateAdapters(state.adapters, action.adapterId, (adapter) => ({
          ...adapter,
          routes: [...adapter.routes, createEmptyRoute()],
        })),
      };
    case 'removeRoute':
      return {
        ...state,
        adapters: updateAdapters(state.adapters, action.adapterId, (adapter) => ({
          ...adapter,
          routes: adapter.routes.filter((route) => route.id !== action.routeId),
        })),
      };
    case 'setSearchDomain':
      return {
        ...state,
        adapters: updateAdapters(state.adapters, action.adapterId, (adapter) => ({
          ...adapter,
          searchDomains: adapter.searchDomains.map((domain, index) =>
            index === action.index ? action.value : domain
          ),
        })),
      };
    case 'addSearchDomain':
      return {
        ...state,
        adapters: updateAdapters(state.adapters, action.adapterId, (adapter) => ({
          ...adapter,
          searchDomains: [...adapter.searchDomains, ''],
        })),
      };
    case 'removeSearchDomain':
      return {
        ...state,
        adapters: updateAdapters(state.adapters, action.adapterId, (adapter) => ({
          ...adapter,
          searchDomains: adapter.searchDomains.filter((_, index) => index !== action.index),
        })),
      };
    case 'setPending':
      return {
        ...state,
        pendingAdapter: action.adapterId,
      };
    case 'replaceAdapter':
      return {
        ...state,
        adapters: state.adapters.map((adapter) =>
          adapter.id === action.adapter.id ? action.adapter : adapter
        ),
      };
    default:
      return state;
  }
};

const connectionStatusClasses: Record<NetworkAdapter['status'], string> = {
  connected: 'text-green-400',
  disconnected: 'text-red-400',
};

const NetworkingApp: React.FC = () => {
  const [state, dispatch] = useReducer(networkingReducer, initialNetworkingState);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    dispatch({ type: 'setAdapters', adapters: loadNetworkAdapters() });
  }, []);

  const selectedAdapter = useMemo(
    () => state.adapters.find((adapter) => adapter.id === state.selectedAdapterId),
    [state.adapters, state.selectedAdapterId]
  );

  const handleAdapterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch({ type: 'selectAdapter', adapterId: event.target.value });
  };

  const handleRouteChange = (
    adapterId: string,
    routeId: string,
    field: keyof Omit<RouteEntry, 'id'>,
    value: string
  ) => {
    dispatch({ type: 'updateRoute', adapterId, routeId, field, value });
  };

  const handleApply = async () => {
    if (!selectedAdapter) {
      return;
    }
    dispatch({ type: 'setPending', adapterId: selectedAdapter.id });
    const result = await applyAdapterConfig(selectedAdapter.id, {
      routes: selectedAdapter.routes,
      searchDomains: selectedAdapter.searchDomains,
    });
    if (result.success) {
      dispatch({ type: 'replaceAdapter', adapter: result.adapter });
      setToastMessage(`Applied network changes to ${result.adapter.name}.`);
    } else {
      setToastMessage(result.message);
    }
    dispatch({ type: 'setPending', adapterId: undefined });
  };

  const isPending = selectedAdapter && state.pendingAdapter === selectedAdapter.id;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-ub-cool-grey text-white">
      <header className="border-b border-gray-800 p-4">
        <h1 className="text-xl font-semibold">Networking</h1>
        <p className="text-sm text-ubt-grey">
          Review simulated adapters, inspect connection details, and tune routing without touching the host OS.
        </p>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Connections</h2>
          {state.adapters.length === 0 ? (
            <p className="text-sm text-ubt-grey">No adapters detected in the lab environment.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {state.adapters.map((adapter) => (
                <article key={adapter.id} className="rounded-md border border-gray-800 bg-[#0f1419] p-4 shadow-inner">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold">{adapter.name}</h3>
                      <p className="text-xs uppercase tracking-wide text-ubt-grey">{adapter.type.toUpperCase()}</p>
                    </div>
                    <span className={`text-sm font-medium ${connectionStatusClasses[adapter.status]}`}>
                      {adapter.status === 'connected' ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-y-2 text-sm">
                    <div>
                      <dt className="text-ubt-grey">IPv4</dt>
                      <dd className="font-mono text-sm">{adapter.ipv4}</dd>
                    </div>
                    <div>
                      <dt className="text-ubt-grey">Gateway</dt>
                      <dd className="font-mono text-sm">{adapter.gateway}</dd>
                    </div>
                    <div>
                      <dt className="text-ubt-grey">DNS</dt>
                      <dd className="font-mono text-sm">{adapter.dns.join(', ')}</dd>
                    </div>
                    <div>
                      <dt className="text-ubt-grey">MAC</dt>
                      <dd className="font-mono text-sm">{adapter.mac}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Advanced configuration</h2>
              <p className="text-sm text-ubt-grey">
                Edit routing tables and DNS search domains for the active adapter. Changes persist to local storage only.
              </p>
            </div>
            {state.adapters.length > 0 && (
              <label className="text-sm">
                <span className="mr-2 text-ubt-grey">Adapter:</span>
                <select
                  value={state.selectedAdapterId}
                  onChange={handleAdapterChange}
                  className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm focus:border-ubt-gedit-blue focus:outline-none"
                >
                  {state.adapters.map((adapter) => (
                    <option key={adapter.id} value={adapter.id}>
                      {adapter.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {selectedAdapter ? (
            <div className="mt-4 space-y-6">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-base font-semibold">Routes</h3>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'addRoute', adapterId: selectedAdapter.id })}
                    className="rounded border border-ubt-gedit-blue px-3 py-1 text-sm text-ubt-gedit-blue transition hover:bg-ubt-gedit-blue hover:text-black"
                  >
                    Add route
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-800 text-sm">
                    <thead className="bg-gray-900 text-left text-xs uppercase tracking-wide text-ubt-grey">
                      <tr>
                        <th className="px-3 py-2">Destination</th>
                        <th className="px-3 py-2">Netmask</th>
                        <th className="px-3 py-2">Gateway</th>
                        <th className="px-3 py-2">Metric</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {selectedAdapter.routes.map((route) => (
                        <tr key={route.id} className="bg-[#111822]">
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={route.destination}
                              onChange={(event) =>
                                handleRouteChange(selectedAdapter.id, route.id, 'destination', event.target.value)
                              }
                              className="w-full rounded border border-gray-700 bg-[#0d131a] px-2 py-1 font-mono text-sm focus:border-ubt-gedit-blue focus:outline-none"
                              placeholder="0.0.0.0"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={route.netmask}
                              onChange={(event) =>
                                handleRouteChange(selectedAdapter.id, route.id, 'netmask', event.target.value)
                              }
                              className="w-full rounded border border-gray-700 bg-[#0d131a] px-2 py-1 font-mono text-sm focus:border-ubt-gedit-blue focus:outline-none"
                              placeholder="255.255.255.0"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={route.gateway}
                              onChange={(event) =>
                                handleRouteChange(selectedAdapter.id, route.id, 'gateway', event.target.value)
                              }
                              className="w-full rounded border border-gray-700 bg-[#0d131a] px-2 py-1 font-mono text-sm focus:border-ubt-gedit-blue focus:outline-none"
                              placeholder="192.168.0.1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={route.metric}
                              onChange={(event) =>
                                handleRouteChange(selectedAdapter.id, route.id, 'metric', event.target.value)
                              }
                              className="w-24 rounded border border-gray-700 bg-[#0d131a] px-2 py-1 font-mono text-sm focus:border-ubt-gedit-blue focus:outline-none"
                              min={0}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => dispatch({ type: 'removeRoute', adapterId: selectedAdapter.id, routeId: route.id })}
                              className="rounded border border-red-500 px-2 py-1 text-xs text-red-400 transition hover:bg-red-500 hover:text-black"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-base font-semibold">DNS search domains</h3>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'addSearchDomain', adapterId: selectedAdapter.id })}
                    className="rounded border border-ubt-gedit-blue px-3 py-1 text-sm text-ubt-gedit-blue transition hover:bg-ubt-gedit-blue hover:text-black"
                  >
                    Add domain
                  </button>
                </div>
                {selectedAdapter.searchDomains.length === 0 ? (
                  <p className="text-sm text-ubt-grey">No search domains configured.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedAdapter.searchDomains.map((domain, index) => (
                      <div key={`${domain}-${index}`} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={domain}
                          onChange={(event) =>
                            dispatch({
                              type: 'setSearchDomain',
                              adapterId: selectedAdapter.id,
                              index,
                              value: event.target.value,
                            })
                          }
                          className="flex-1 rounded border border-gray-700 bg-[#0d131a] px-2 py-1 font-mono text-sm focus:border-ubt-gedit-blue focus:outline-none"
                          placeholder="corp.example"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            dispatch({
                              type: 'removeSearchDomain',
                              adapterId: selectedAdapter.id,
                              index,
                            })
                          }
                          className="rounded border border-red-500 px-2 py-1 text-xs text-red-400 transition hover:bg-red-500 hover:text-black"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={Boolean(isPending)}
                  className={`rounded px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-ubt-gedit-blue ${
                    isPending
                      ? 'cursor-not-allowed bg-gray-700 text-gray-400'
                      : 'bg-ubt-gedit-blue text-black hover:bg-ubt-gedit-blue/90'
                  }`}
                >
                  {isPending ? 'Applying…' : 'Apply changes'}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ubt-grey">Select an adapter to manage its configuration.</p>
          )}
        </section>
      </div>
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage('')} />
      )}
    </div>
  );
};

export default NetworkingApp;
