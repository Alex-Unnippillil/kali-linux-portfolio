import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import {
  defaults,
  getUpdateAllowMetered,
  getUpdateAutoDownload,
  getUpdateChannel,
  getUpdateDeferWindow,
  setUpdateAllowMetered,
  setUpdateAutoDownload,
  setUpdateChannel,
  setUpdateDeferWindow,
} from '../utils/settingsStore';

export type UpdateChannel = 'security' | 'feature';
const DEFER_VALUES = ['off', '1h', '4h', '1d', '7d'] as const;
export type DeferWindow = (typeof DEFER_VALUES)[number];

export interface UpdatePreferencesState {
  channel: UpdateChannel;
  setChannel: Dispatch<SetStateAction<UpdateChannel>>;
  autoDownload: boolean;
  setAutoDownload: Dispatch<SetStateAction<boolean>>;
  allowMetered: boolean;
  setAllowMetered: Dispatch<SetStateAction<boolean>>;
  deferWindow: DeferWindow;
  setDeferWindow: Dispatch<SetStateAction<DeferWindow>>;
  isReady: boolean;
}

export const UPDATE_CHANNEL_OPTIONS: readonly {
  value: UpdateChannel;
  label: string;
  description: string;
}[] = [
  {
    value: 'security',
    label: 'Security channel',
    description: 'Prioritise stability with only vetted security updates.',
  },
  {
    value: 'feature',
    label: 'Feature channel',
    description: 'Receive new features alongside security fixes as soon as they land.',
  },
];

export const DEFER_WINDOW_LABELS: Readonly<Record<DeferWindow, string>> = {
  off: 'Immediate install',
  '1h': '1 hour',
  '4h': '4 hours',
  '1d': '1 day',
  '7d': '7 days',
};

export const DEFER_WINDOW_OPTIONS = (
  Object.entries(DEFER_WINDOW_LABELS) as [DeferWindow, string][]
).map(([value, label]) => ({ value, label }));

const rawDefaults = defaults as {
  updateChannel?: string;
  updateAutoDownload?: boolean;
  updateAllowMetered?: boolean;
  updateDeferWindow?: string;
};

const sanitiseChannel = (value?: string | null): UpdateChannel =>
  value === 'feature' ? 'feature' : 'security';

const sanitiseDeferWindow = (value?: string | null): DeferWindow => {
  if (!value) return 'off';
  return (DEFER_VALUES as readonly string[]).includes(value)
    ? (value as DeferWindow)
    : 'off';
};

const DEFAULT_CHANNEL = sanitiseChannel(rawDefaults.updateChannel);
const DEFAULT_AUTO_DOWNLOAD =
  rawDefaults.updateAutoDownload !== undefined
    ? rawDefaults.updateAutoDownload
    : true;
const DEFAULT_ALLOW_METERED =
  rawDefaults.updateAllowMetered !== undefined
    ? rawDefaults.updateAllowMetered
    : false;
const DEFAULT_DEFER_WINDOW = sanitiseDeferWindow(rawDefaults.updateDeferWindow);

export function useUpdatePreferences(): UpdatePreferencesState {
  const [channel, setChannel] = useState<UpdateChannel>(DEFAULT_CHANNEL);
  const [autoDownload, setAutoDownload] = useState<boolean>(DEFAULT_AUTO_DOWNLOAD);
  const [allowMetered, setAllowMetered] = useState<boolean>(DEFAULT_ALLOW_METERED);
  const [deferWindow, setDeferWindow] = useState<DeferWindow>(DEFAULT_DEFER_WINDOW);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [storedChannel, storedAutoDownload, storedAllowMetered, storedDeferWindow] =
        await Promise.all([
          getUpdateChannel(),
          getUpdateAutoDownload(),
          getUpdateAllowMetered(),
          getUpdateDeferWindow(),
        ]);

      if (cancelled) {
        return;
      }

      setChannel(sanitiseChannel(storedChannel));
      setAutoDownload(storedAutoDownload);
      setAllowMetered(storedAllowMetered);
      setDeferWindow(sanitiseDeferWindow(storedDeferWindow));
      setIsReady(true);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    void setUpdateChannel(channel);
  }, [channel, isReady]);

  useEffect(() => {
    if (!isReady) return;
    void setUpdateAutoDownload(autoDownload);
  }, [autoDownload, isReady]);

  useEffect(() => {
    if (!isReady) return;
    void setUpdateAllowMetered(allowMetered);
  }, [allowMetered, isReady]);

  useEffect(() => {
    if (!isReady) return;
    void setUpdateDeferWindow(deferWindow);
  }, [deferWindow, isReady]);

  return {
    channel,
    setChannel,
    autoDownload,
    setAutoDownload,
    allowMetered,
    setAllowMetered,
    deferWindow,
    setDeferWindow,
    isReady,
  };
}
