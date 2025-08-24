/* eslint-disable no-restricted-globals */
import { solve } from './solver';
import type { Board } from './types';

self.onmessage = (e: MessageEvent<Board>) => {
  const result = solve(e.data);
  // @ts-ignore
  postMessage(result);
};
