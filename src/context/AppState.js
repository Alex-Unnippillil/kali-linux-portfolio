const React = require('react');
function buildInitialState() {
  return { windows: {}, favorites: {}, desktopShortcuts: [] };
}

const AppStateContext = React.createContext();
const AppDispatchContext = React.createContext();

function appReducer(state, action) {
  switch (action.type) {
    case 'OPEN_WINDOW': {
      const win = state.windows[action.id] || { isOpen: false, isFocused: false, isMinimized: false };
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: { ...win, isOpen: true, isFocused: true, isMinimized: false }
        }
      };
    }
    case 'CLOSE_WINDOW': {
      const win = state.windows[action.id] || {};
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: { ...win, isOpen: false, isFocused: false }
        }
      };
    }
    case 'FOCUS_WINDOW': {
      const updated = {};
      Object.keys(state.windows).forEach(id => {
        const win = state.windows[id];
        updated[id] = { ...win, isFocused: id === action.id };
      });
      return { ...state, windows: updated };
    }
    case 'MINIMIZE_WINDOW': {
      const win = state.windows[action.id] || {};
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: { ...win, isMinimized: action.minimized }
        }
      };
    }
    case 'ADD_FAVORITE': {
      return { ...state, favorites: { ...state.favorites, [action.id]: true } };
    }
    case 'REMOVE_FAVORITE': {
      return { ...state, favorites: { ...state.favorites, [action.id]: false } };
    }
    case 'SET_DESKTOP_SHORTCUTS': {
      return { ...state, desktopShortcuts: action.ids };
    }
    default:
      return state;
  }
}

function AppStateProvider({ children }) {
  const [state, dispatch] = React.useReducer(appReducer, undefined, buildInitialState);
  return React.createElement(
    AppStateContext.Provider,
    { value: state },
    React.createElement(AppDispatchContext.Provider, { value: dispatch }, children)
  );
}

function useAppState() {
  const context = React.useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}

function useAppDispatch() {
  const context = React.useContext(AppDispatchContext);
  if (context === undefined) {
    throw new Error('useAppDispatch must be used within AppStateProvider');
  }
  return context;
}

module.exports = {
  AppStateProvider,
  useAppState,
  useAppDispatch,
  appReducer,
  buildInitialState
};

