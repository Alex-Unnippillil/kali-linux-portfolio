import type { WebGLRenderer } from 'three';

declare module 'three' {
  export type Renderer = WebGLRenderer;
}
