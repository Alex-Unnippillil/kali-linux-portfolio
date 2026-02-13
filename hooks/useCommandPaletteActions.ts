import { useEffect, type DependencyList } from 'react';
import {
  useCommandPalette,
  type CommandPaletteAction,
} from '../components/desktop/CommandPalette';

/**
 * Register a set of command palette actions for the lifecycle of a component.
 * The optional dependency list controls when the actions should be refreshed.
 */
export const useCommandPaletteActions = (
  actions: CommandPaletteAction[],
  deps?: DependencyList,
) => {
  const { registerActions, unregisterActions } = useCommandPalette();
  const effectDeps: DependencyList = deps ? [...deps] : [actions];

  useEffect(() => {
    if (!actions.length) return;
    registerActions(actions);
    return () => unregisterActions(actions.map((action) => action.id));
  }, [registerActions, unregisterActions, ...effectDeps]);
};
