import * as Comlink from 'comlink';
import { getScore, getRating } from 'cvss';

function score(vector: string) {
  const base = getScore(vector);
  const rating = getRating(base);
  return { base, rating };
}

Comlink.expose({ score });
