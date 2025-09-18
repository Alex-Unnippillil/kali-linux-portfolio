import { networkingReducer, initialNetworkingState } from '../../../components/apps/networking';
import { loadNetworkAdapters, resetNetworkConfig } from '../../../utils/networkState';

describe('networkingReducer', () => {
  beforeEach(() => {
    resetNetworkConfig();
  });

  it('initializes adapters and tracks selection', () => {
    const adapters = loadNetworkAdapters();
    const state = networkingReducer(initialNetworkingState, {
      type: 'setAdapters',
      adapters,
    });

    expect(state.adapters).toHaveLength(adapters.length);
    expect(state.selectedAdapterId).toBe(adapters[0].id);

    const nextState = networkingReducer(state, {
      type: 'selectAdapter',
      adapterId: adapters[1].id,
    });

    expect(nextState.selectedAdapterId).toBe(adapters[1].id);

    const reloaded = networkingReducer(nextState, {
      type: 'setAdapters',
      adapters,
    });

    expect(reloaded.selectedAdapterId).toBe(adapters[1].id);
  });

  it('updates routes when editing, adding, and removing entries', () => {
    const adapters = loadNetworkAdapters();
    let state = networkingReducer(initialNetworkingState, {
      type: 'setAdapters',
      adapters,
    });
    const adapterId = adapters[0].id;
    const originalRoute = adapters[0].routes[0];

    state = networkingReducer(state, {
      type: 'updateRoute',
      adapterId,
      routeId: originalRoute.id,
      field: 'destination',
      value: '172.16.0.0',
    });

    expect(state.adapters[0].routes[0].destination).toBe('172.16.0.0');

    state = networkingReducer(state, {
      type: 'addRoute',
      adapterId,
    });

    expect(state.adapters[0].routes).toHaveLength(adapters[0].routes.length + 1);
    const addedRoute = state.adapters[0].routes[state.adapters[0].routes.length - 1];
    expect(addedRoute.id).not.toBe(originalRoute.id);
    expect(addedRoute.destination).toBe('');

    state = networkingReducer(state, {
      type: 'removeRoute',
      adapterId,
      routeId: addedRoute.id,
    });

    expect(state.adapters[0].routes).toHaveLength(adapters[0].routes.length);
  });

  it('manages search domains, pending state, and adapter replacement', () => {
    const adapters = loadNetworkAdapters();
    let state = networkingReducer(initialNetworkingState, {
      type: 'setAdapters',
      adapters,
    });
    const adapterId = adapters[0].id;

    state = networkingReducer(state, {
      type: 'setSearchDomain',
      adapterId,
      index: 0,
      value: 'corp.local',
    });

    expect(state.adapters[0].searchDomains[0]).toBe('corp.local');

    state = networkingReducer(state, {
      type: 'addSearchDomain',
      adapterId,
    });

    expect(state.adapters[0].searchDomains[state.adapters[0].searchDomains.length - 1]).toBe('');

    const removalIndex = state.adapters[0].searchDomains.length - 1;
    state = networkingReducer(state, {
      type: 'removeSearchDomain',
      adapterId,
      index: removalIndex,
    });

    expect(state.adapters[0].searchDomains).toHaveLength(adapters[0].searchDomains.length);

    state = networkingReducer(state, {
      type: 'setPending',
      adapterId,
    });

    expect(state.pendingAdapter).toBe(adapterId);

    const replacement = {
      ...state.adapters[0],
      name: 'Updated Adapter',
    };

    state = networkingReducer(state, {
      type: 'replaceAdapter',
      adapter: replacement,
    });

    expect(state.adapters[0].name).toBe('Updated Adapter');
    expect(state.pendingAdapter).toBe(adapterId);
  });
});
