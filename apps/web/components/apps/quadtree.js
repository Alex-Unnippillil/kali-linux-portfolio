class Quadtree {
  constructor(x, y, w, h, depth = 0) {
    this.bounds = { x, y, w, h };
    this.depth = depth;
    this.objects = [];
    this.nodes = [];
  }

  clear() {
    this.objects.length = 0;
    this.nodes.forEach((n) => n.clear());
    this.nodes.length = 0;
  }

  split() {
    const { x, y, w, h } = this.bounds;
    const hw = w / 2;
    const hh = h / 2;
    this.nodes[0] = new Quadtree(x, y, hw, hh, this.depth + 1);
    this.nodes[1] = new Quadtree(x + hw, y, hw, hh, this.depth + 1);
    this.nodes[2] = new Quadtree(x, y + hh, hw, hh, this.depth + 1);
    this.nodes[3] = new Quadtree(x + hw, y + hh, hw, hh, this.depth + 1);
  }

  getIndex(obj) {
    const verticalMidpoint = this.bounds.x + this.bounds.w / 2;
    const horizontalMidpoint = this.bounds.y + this.bounds.h / 2;
    const top = obj.y - obj.r < horizontalMidpoint && obj.y + obj.r < horizontalMidpoint;
    const bottom = obj.y - obj.r > horizontalMidpoint;
    const left = obj.x - obj.r < verticalMidpoint && obj.x + obj.r < verticalMidpoint;
    const right = obj.x - obj.r > verticalMidpoint;
    if (left) {
      if (top) return 0;
      if (bottom) return 2;
    }
    if (right) {
      if (top) return 1;
      if (bottom) return 3;
    }
    return -1;
  }

  insert(obj) {
    if (this.nodes.length) {
      const index = this.getIndex(obj);
      if (index !== -1) {
        this.nodes[index].insert(obj);
        return;
      }
    }
    this.objects.push(obj);
    if (this.objects.length > 4 && this.depth < 5) {
      if (!this.nodes.length) this.split();
      let i = 0;
      while (i < this.objects.length) {
        const index = this.getIndex(this.objects[i]);
        if (index !== -1) this.nodes[index].insert(this.objects.splice(i, 1)[0]);
        else i += 1;
      }
    }
  }

  retrieve(obj, out = []) {
    const index = this.getIndex(obj);
    if (index !== -1 && this.nodes.length) this.nodes[index].retrieve(obj, out);
    out.push(...this.objects);
    return out;
  }
}

export default Quadtree;
