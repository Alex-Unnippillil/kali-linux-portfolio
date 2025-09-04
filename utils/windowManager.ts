export default class WindowManager {
  private order: string[] = [];
  private baseZ: number;

  constructor(baseZ = 1) {
    this.baseZ = baseZ;
  }

  register(id: string): number {
    if (!this.order.includes(id)) {
      this.order.push(id);
    }
    return this.getZIndex(id);
  }

  focus(id: string): number {
    this.order = this.order.filter(w => w !== id);
    this.order.push(id);
    return this.getZIndex(id);
  }

  remove(id: string): void {
    this.order = this.order.filter(w => w !== id);
  }

  getZIndex(id: string): number {
    const idx = this.order.indexOf(id);
    return idx === -1 ? this.baseZ - 1 : this.baseZ + idx;
  }

  getOrder(): string[] {
    return [...this.order];
  }
}
