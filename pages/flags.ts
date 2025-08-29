import { flag } from 'flags/next';

export const exampleFlag = flag({ key: 'example', defaultValue: false });

export default function Flags() {
  return null;
}
