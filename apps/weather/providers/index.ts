import demo from './demo';
import openMeteo from './openMeteo';
import type { WeatherProvider } from './types';

const providerMap = {
  [openMeteo.id]: openMeteo,
  [demo.id]: demo,
} as const;

export type WeatherProviderId = keyof typeof providerMap;

export const weatherProviders: Record<WeatherProviderId, WeatherProvider> = providerMap;

export const defaultProviderId: WeatherProviderId = openMeteo.id;

export const providerOptions: WeatherProvider[] = Object.values(providerMap);

export const providerIds: WeatherProviderId[] = Object.keys(providerMap) as WeatherProviderId[];

export const isProviderId = (value: unknown): value is WeatherProviderId =>
  typeof value === 'string' && (value as string) in providerMap;

export const getProvider = (id?: string | null): WeatherProvider => {
  if (id && id in providerMap) {
    return providerMap[id as WeatherProviderId];
  }
  return providerMap[defaultProviderId];
};
