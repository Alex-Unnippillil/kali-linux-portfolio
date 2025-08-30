import { flag } from '@vercel/flags/next';

export const beta = flag<boolean>({
  key: 'beta',
  decide: async () => false,
  description: 'beta flag',
});

export function reportValue(_name: string, _value: unknown): void {
  // no-op
}

