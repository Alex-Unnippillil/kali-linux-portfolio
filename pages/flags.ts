import { flag } from 'flags/next';

export const exampleFlag = flag({
  key: 'example',
  defaultValue: false,
  decide: () => false,
});

export default function Flags() {
  return null;
}
