'use client';

import { publish as pub, subscribe as sub } from './pubsub';

export type SettingsMessage = {
  channel: string;
  property: string;
  value: unknown;
};

const TOPIC = 'settings';

export const publish = (channel: string, property: string, value: unknown): void => {
  pub(TOPIC, { channel, property, value });
};

export const subscribe = (handler: (msg: SettingsMessage) => void): (() => void) =>
  sub(TOPIC, handler as unknown as (data: unknown) => void);

const settingsBus = { publish, subscribe };

export default settingsBus;
