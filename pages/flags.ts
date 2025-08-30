import { flag } from 'flags/next';

export const exampleFlag = flag({
  key: 'example',
  defaultValue: false,
  decide: () => false,
});

export const flags = { exampleFlag };

export default function Flags() {
  return null;
}
