import { flag } from 'flags/next';


// Example feature flag used by pages/api/vercel/flags.ts
export const exampleFlag = flag<boolean>({
  key: 'example-flag',
  decide() {
    return false;
  },
});

export const beta = flag<boolean>({
  key: 'beta',
  decide() {
    return false;
  },
});

