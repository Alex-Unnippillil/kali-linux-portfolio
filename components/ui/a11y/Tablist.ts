import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type FocusEventHandler,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type ReactNode,
} from 'react';
import { RovingTabIndexProvider, useRovingTabIndex, type RovingOrientation } from './RovingTabIndex';

type TablistContextValue = {
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  manual: boolean;
};

const TablistContext = createContext<TablistContextValue | undefined>(undefined);

export type TablistProviderProps = {
  children: ReactNode;
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string) => void;
  manual?: boolean;
  orientation?: RovingOrientation;
  loop?: boolean;
};

export const TablistProvider = ({
  children,
  value,
  defaultValue = null,
  onChange,
  manual = false,
  orientation = 'horizontal',
  loop = true,
}: TablistProviderProps) => {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<string | null>(defaultValue);

  const selectedId = (isControlled ? value : internalValue) ?? null;

  const setSelectedId = useCallback(
    (nextId: string) => {
      if (!isControlled) {
        setInternalValue(nextId);
      }
      onChange?.(nextId);
    },
    [isControlled, onChange],
  );

  const contextValue = useMemo<TablistContextValue>(
    () => ({ selectedId, setSelectedId, manual }),
    [selectedId, setSelectedId, manual],
  );

  return (
    <RovingTabIndexProvider orientation={orientation} loop={loop} defaultActiveId={selectedId}>
      <TablistContext.Provider value={contextValue}>{children}</TablistContext.Provider>
    </RovingTabIndexProvider>
  );
};

export const useTablist = () => {
  const context = useContext(TablistContext);
  if (!context) {
    throw new Error('useTablist must be used within a TablistProvider');
  }
  return context;
};

type UseTabOptions = {
  id: string;
  panelId?: string;
  disabled?: boolean;
};

type UseTabResult = {
  id: string;
  role: 'tab';
  tabIndex: number;
  ref: (node: HTMLElement | null) => void;
  onFocus: React.FocusEventHandler<HTMLElement>;
  onKeyDown: KeyboardEventHandler<HTMLElement>;
  onClick: MouseEventHandler<HTMLElement>;
  'aria-selected': boolean;
  'aria-controls'?: string;
  'aria-disabled'?: boolean;
  'data-state': 'active' | 'inactive';
};

export const useTab = ({ id, panelId, disabled = false }: UseTabOptions): UseTabResult => {
  const { selectedId, setSelectedId, manual } = useTablist();
  const { tabIndex, ref, onFocus: rovingFocus, onKeyDown: rovingKeyDown } = useRovingTabIndex({
    id,
    disabled,
  });

  const isSelected = selectedId === id;

  const handleFocus: FocusEventHandler<HTMLElement> = useCallback(
    () => {
      rovingFocus();
      if (!manual && !disabled) {
        setSelectedId(id);
      }
    },
    [rovingFocus, manual, disabled, setSelectedId, id],
  );

  const handleKeyDown: KeyboardEventHandler<HTMLElement> = useCallback(
    (event) => {
      rovingKeyDown(event);
      if (event.defaultPrevented) return;

      if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        setSelectedId(id);
      }
    },
    [rovingKeyDown, disabled, setSelectedId, id],
  );

  const handleClick: MouseEventHandler<HTMLElement> = useCallback(
    (event) => {
      if (disabled) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      setSelectedId(id);
    },
    [disabled, setSelectedId, id],
  );

  return {
    id,
    role: 'tab',
    tabIndex,
    ref,
    onFocus: handleFocus,
    onKeyDown: handleKeyDown,
    onClick: handleClick,
    'aria-selected': isSelected,
    'aria-controls': panelId,
    'aria-disabled': disabled || undefined,
    'data-state': isSelected ? 'active' : 'inactive',
  };
};

type UseTabPanelOptions = {
  id: string;
  tabId: string;
  focusable?: boolean;
};

type UseTabPanelResult = {
  id: string;
  role: 'tabpanel';
  'aria-labelledby': string;
  hidden: boolean;
  tabIndex?: number;
  'data-state': 'active' | 'inactive';
};

export const useTabPanel = ({ id, tabId, focusable = true }: UseTabPanelOptions): UseTabPanelResult => {
  const { selectedId } = useTablist();
  const isSelected = selectedId === tabId;

  return {
    id,
    role: 'tabpanel',
    'aria-labelledby': tabId,
    hidden: !isSelected,
    tabIndex: focusable ? 0 : undefined,
    'data-state': isSelected ? 'active' : 'inactive',
  };
};
