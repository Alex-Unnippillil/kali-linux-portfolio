declare module 'tlsh' {
  export default function tlsh(data: string): string;
}

declare module 'tlsh/lib/digests/digest-hash-builder' {
  class DigestHashBuilder {
    withHash(hash: string): this;
    build(): { calculateDifference(other: any, includeLength: boolean): number };
  }
  export default DigestHashBuilder;
}
