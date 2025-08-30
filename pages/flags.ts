import { flag } from 'flags/next';

// The flags SDK now requires a decide function for each flag
export const exampleFlag = flag<boolean>({
  key: 'example',
  decide() {
    return false;
  },
});

export default function Flags() {
  return null;
}
