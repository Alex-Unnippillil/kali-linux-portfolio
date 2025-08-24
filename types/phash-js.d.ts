declare module 'phash-js' {
  interface Hash {
    toHex(): string;
    toBinary(): string;
  }
  const pHash: {
    hash(file: File): Promise<Hash>;
  };
  export default pHash;
}
