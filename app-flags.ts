import { flag } from 'flags/next';

export const beta = flag<boolean>({
  key: 'beta',
  decide() {
    return false;
  },
});

export function reportValue(_name: string, _value: unknown): void {
  // no-op
}

