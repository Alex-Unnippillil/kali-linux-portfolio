export class RingBuffer<T> {
  private buffer: (T | undefined)[];
  private writeIndex = 0;
  private length = 0;

  constructor(private readonly capacity: number) {
    if (!Number.isFinite(capacity) || capacity <= 0) {
      throw new Error('RingBuffer capacity must be a positive number');
    }
    this.buffer = new Array<T | undefined>(capacity);
  }

  push(value: T) {
    this.buffer[this.writeIndex] = value;
    this.writeIndex = (this.writeIndex + 1) % this.capacity;
    if (this.length < this.capacity) {
      this.length += 1;
    }
  }

  size() {
    return this.length;
  }

  maxSize() {
    return this.capacity;
  }

  isFull() {
    return this.length === this.capacity;
  }

  clear() {
    this.buffer.fill(undefined);
    this.writeIndex = 0;
    this.length = 0;
  }

  peekLatest(): T | undefined {
    if (!this.length) return undefined;
    const index = (this.writeIndex - 1 + this.capacity) % this.capacity;
    return this.buffer[index];
  }

  toArray(): T[] {
    const result = new Array<T>(this.length);
    for (let i = 0; i < this.length; i += 1) {
      const index = (this.writeIndex - this.length + i + this.capacity) % this.capacity;
      const value = this.buffer[index];
      if (value !== undefined) {
        result[i] = value;
      }
    }
    return result;
  }
}
