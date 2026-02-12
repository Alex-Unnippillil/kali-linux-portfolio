import type { NextRouter } from 'next/router';

export type SearchResultType = 'apps' | 'settings' | 'files' | 'commands' | 'help';

export interface BaseSearchResult {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  meta?: string;
}

export interface AppSearchResult extends BaseSearchResult {
  type: 'apps';
  /**
   * Optional explicit app id in case it differs from the result id.
   */
  appId?: string;
  /**
   * Optional href for deep linking into the public apps catalog page.
   */
  href?: string;
}

export interface SettingsSearchResult extends BaseSearchResult {
  type: 'settings';
  /**
   * Item identifier used to jump directly to a settings panel.
   */
  item?: string;
  /**
   * Optional section anchor in the settings app.
   */
  section?: string;
}

export interface FileSearchResult extends BaseSearchResult {
  type: 'files';
  /**
   * Absolute or virtual path for the file.
   */
  path: string;
  /**
   * Optional external URL to preview or download the file.
   */
  href?: string;
}

export interface CommandSearchResult extends BaseSearchResult {
  type: 'commands';
  /**
   * Shell command that can be copied or executed.
   */
  command: string;
  /**
   * Optional shell label (bash, zsh, powershell, etc.).
   */
  shell?: string;
}

export interface HelpSearchResult extends BaseSearchResult {
  type: 'help';
  /**
   * External link to documentation or a knowledge-base article.
   */
  url: string;
}

export type SearchResult =
  | AppSearchResult
  | SettingsSearchResult
  | FileSearchResult
  | CommandSearchResult
  | HelpSearchResult;

export interface QuickActionDefinition {
  id: string;
  label: string;
  tooltip: string;
  icon?: string;
}

export type QuickActionsRegistry = Record<SearchResultType, QuickActionDefinition[]>;

type QuickActionHandler = (result: SearchResult, router: NextRouter) => Promise<void> | void;

const actionHandlers: Record<SearchResultType, Record<string, QuickActionHandler>> = {
  apps: {
    open: (result) => {
      if (result.type !== 'apps') return;
      const appId = result.appId ?? result.id;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-app', { detail: appId }));
      }
    },
    inspect: (result, router) => {
      if (result.type !== 'apps') return;
      const href = result.href ?? `/apps/${result.id}`;
      void router.push(href);
    },
  },
  settings: {
    open: (result, router) => {
      if (result.type !== 'settings') return;
      const item = result.item ?? result.id;
      void router.push(`/apps/settings?item=${encodeURIComponent(item)}`);
    },
    section: (result, router) => {
      if (result.type !== 'settings') return;
      const section = result.section ?? result.item ?? result.id;
      void router.push(`/apps/settings?section=${encodeURIComponent(section)}`);
    },
  },
  files: {
    open: (result) => {
      if (result.type !== 'files') return;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-app', { detail: 'file-explorer' }));
      }
    },
    copyPath: async (result) => {
      if (result.type !== 'files') return;
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(result.path);
      }
    },
    preview: (result) => {
      if (result.type !== 'files') return;
      if (!result.href) return;
      if (typeof window !== 'undefined') {
        window.open(result.href, '_blank', 'noopener');
      }
    },
  },
  commands: {
    run: (result) => {
      if (result.type !== 'commands') return;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-app', { detail: 'terminal' }));
        window.dispatchEvent(
          new CustomEvent('terminal:queue-command', { detail: { command: result.command } }),
        );
      }
    },
    copy: async (result) => {
      if (result.type !== 'commands') return;
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(result.command);
      }
    },
  },
  help: {
    open: (result) => {
      if (result.type !== 'help') return;
      if (typeof window !== 'undefined') {
        window.open(result.url, '_blank', 'noopener');
      }
    },
    copy: async (result) => {
      if (result.type !== 'help') return;
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(result.url);
      }
    },
  },
};

export const isQuickActionSupported = (type: SearchResultType, actionId: string): boolean =>
  Boolean(actionHandlers[type]?.[actionId]);

export const runQuickAction = async (
  actionId: string,
  result: SearchResult,
  router: NextRouter,
  onAfterAction?: () => void,
): Promise<void> => {
  const handler = actionHandlers[result.type]?.[actionId];
  if (!handler) {
    return;
  }
  await handler(result, router);
  if (onAfterAction) onAfterAction();
};

export const getQuickActionHandlers = () => actionHandlers;
