export interface BloomFilterOptions {
  /** Number of bits in the Bloom filter bitset */
  size: number;
  /** Number of hash functions to apply to each value */
  hashCount: number;
}

/**
 * Lightweight Bloom filter implementation used to simulate NSRL lookups.
 * The filter works entirely in memory and avoids async APIs so it can run in
 * both Node (tests) and the browser (Next.js client components).
 */
export class BloomFilter {
  public readonly size: number;
  public readonly hashCount: number;
  private readonly bits: Uint8Array;
  private items = 0;

  constructor(options: BloomFilterOptions) {
    if (!Number.isInteger(options.size) || options.size <= 0) {
      throw new Error('BloomFilter size must be a positive integer');
    }
    if (!Number.isInteger(options.hashCount) || options.hashCount <= 0) {
      throw new Error('BloomFilter hash count must be a positive integer');
    }
    this.size = options.size;
    this.hashCount = options.hashCount;
    this.bits = new Uint8Array(Math.ceil(this.size / 8));
  }

  /** Number of values that have been inserted. */
  get insertedItems(): number {
    return this.items;
  }

  /**
   * Adds a string value to the Bloom filter.
   */
  add(value: string): void {
    this.hashIndices(value).forEach((index) => this.setBit(index));
    this.items += 1;
  }

  /**
   * Checks if a string value *might* exist in the filter. False positives are
   * possible, but false negatives are not.
   */
  has(value: string): boolean {
    return this.hashIndices(value).every((index) => this.getBit(index));
  }

  /**
   * Estimates the theoretical false positive rate based on the number of
   * values inserted so far.
   */
  estimateFalsePositiveRate(inserted: number = this.items): number {
    if (inserted <= 0) {
      return 0;
    }
    const exponent = -((this.hashCount * inserted) / this.size);
    const probability = Math.pow(1 - Math.exp(exponent), this.hashCount);
    return probability;
  }

  /**
   * Serialises the Bloom filter state to an object that can be stored or
   * inspected. Primarily used for debugging/telemetry in the UI layer.
   */
  toJSON() {
    return {
      size: this.size,
      hashCount: this.hashCount,
      bits: Array.from(this.bits),
      items: this.items,
    };
  }

  /**
   * Builds a Bloom filter pre-populated with the provided values.
   */
  static from(values: string[], errorRate = 0.01): BloomFilter {
    const { size, hashCount } = BloomFilter.optimalParameters(
      Math.max(values.length, 1),
      errorRate
    );
    const filter = new BloomFilter({ size, hashCount });
    values.forEach((value) => filter.add(value));
    return filter;
  }

  /**
   * Calculates optimal Bloom filter parameters for a target dataset size and
   * false positive rate.
   */
  static optimalParameters(
    expectedItems: number,
    falsePositiveRate = 0.01
  ): BloomFilterOptions {
    if (expectedItems <= 0) {
      throw new Error('expectedItems must be greater than zero');
    }
    if (falsePositiveRate <= 0 || falsePositiveRate >= 1) {
      throw new Error('falsePositiveRate must be between 0 and 1');
    }
    const ln2 = Math.log(2);
    const size = Math.ceil(
      (-expectedItems * Math.log(falsePositiveRate)) / (ln2 * ln2)
    );
    const hashCount = Math.max(1, Math.round((size / expectedItems) * ln2));
    return { size, hashCount };
  }

  private hashIndices(value: string): number[] {
    const indices: number[] = new Array(this.hashCount);
    const hashA = BloomFilter.fnv1a(value, 0x811c9dc5);
    let hashB = BloomFilter.fnv1a(value, 0x9e3779b9);
    if (hashB === 0) {
      hashB = 0x9e3779b9;
    }
    for (let i = 0; i < this.hashCount; i += 1) {
      const combined = (hashA + Math.imul(i, hashB)) >>> 0;
      indices[i] = combined % this.size;
    }
    return indices;
  }

  private setBit(index: number): void {
    const byteIndex = index >> 3;
    const bitMask = 1 << (index & 7);
    this.bits[byteIndex] |= bitMask;
  }

  private getBit(index: number): boolean {
    const byteIndex = index >> 3;
    const bitMask = 1 << (index & 7);
    return (this.bits[byteIndex] & bitMask) !== 0;
  }

  private static fnv1a(value: string, seed: number): number {
    let hash = seed >>> 0;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
      hash >>>= 0;
    }
    return hash >>> 0;
  }
}
