'use client';
import { Howl } from 'howler';

export function loadSound(src: string) {
  return new Howl({ src: [src] });
}
