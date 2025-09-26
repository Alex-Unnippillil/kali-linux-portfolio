export {};

declare global {
  type ImageDataArray = Uint8ClampedArray | number[];
  interface ActiveXObject {
    readonly [key: string]: unknown;
  }
}
