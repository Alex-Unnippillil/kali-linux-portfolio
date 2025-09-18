import { DiskNode, pathToId } from '@/types/disk';

export interface TreemapRect {
  node: DiskNode;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}

export interface SunburstArc {
  node: DiskNode;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  depth: number;
}

const hashString = (input: string): number => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
};

export const colorForNode = (node: DiskNode, depth: number): string => {
  const base = hashString(node.id || pathToId(node.path));
  const hue = base % 360;
  const lightness = Math.max(28, 68 - depth * 8);
  return `hsl(${hue}, 62%, ${lightness}%)`;
};

const collectChildren = (node: DiskNode): DiskNode[] =>
  (node.children ?? []).filter((child) => child.size > 0);

export const computeTreemap = (
  root: DiskNode,
  width: number,
  height: number,
  maxDepth = 4,
): TreemapRect[] => {
  const rects: TreemapRect[] = [];
  if (width <= 0 || height <= 0) return rects;

  const traverse = (
    node: DiskNode,
    x: number,
    y: number,
    w: number,
    h: number,
    depth: number,
    horizontal: boolean,
  ) => {
    const children = collectChildren(node);
    const total = children.reduce((sum, child) => sum + child.size, 0);
    if (!children.length || depth >= maxDepth) {
      return;
    }

    let offset = 0;
    children.forEach((child) => {
      if (child.size <= 0 || total <= 0) return;
      const ratio = child.size / total;
      const childWidth = horizontal ? w * ratio : w;
      const childHeight = horizontal ? h : h * ratio;
      const childX = horizontal ? x + offset : x;
      const childY = horizontal ? y : y + offset;
      rects.push({
        node: child,
        x: childX,
        y: childY,
        width: childWidth,
        height: childHeight,
        depth: depth + 1,
      });
      if ((child.children?.length ?? 0) > 0 && depth + 1 < maxDepth) {
        traverse(child, childX, childY, childWidth, childHeight, depth + 1, !horizontal);
      }
      offset += horizontal ? childWidth : childHeight;
    });
  };

  traverse(root, 0, 0, width, height, 0, width >= height);
  return rects;
};

export const getMaxDepth = (node: DiskNode): number => {
  if (!node.children || node.children.length === 0) {
    return 1;
  }
  return (
    1 +
    node.children.reduce((max, child) => {
      const depth = getMaxDepth(child);
      return depth > max ? depth : max;
    }, 0)
  );
};

export const computeSunburst = (
  root: DiskNode,
  radius: number,
  maxDepth = getMaxDepth(root),
): SunburstArc[] => {
  const arcs: SunburstArc[] = [];
  if (radius <= 0) return arcs;
  const depthLimit = Math.max(1, maxDepth);
  const ring = radius / depthLimit;

  const traverse = (
    node: DiskNode,
    startAngle: number,
    endAngle: number,
    depth: number,
  ) => {
    const span = endAngle - startAngle;
    if (span <= 0) return;
    const inner = ring * depth;
    const outer = ring * (depth + 1);
    arcs.push({
      node,
      startAngle,
      endAngle,
      innerRadius: inner,
      outerRadius: outer,
      depth,
    });

    if (depth + 1 >= depthLimit) return;

    const children = collectChildren(node);
    if (!children.length) return;
    const total = children.reduce((sum, child) => sum + child.size, 0);
    if (total <= 0) return;
    let current = startAngle;
    children.forEach((child) => {
      const ratio = child.size / total;
      if (ratio <= 0) return;
      const childSpan = span * ratio;
      const next = current + childSpan;
      traverse(child, current, next, depth + 1);
      current = next;
    });
  };

  traverse(root, 0, Math.PI * 2, 0);
  return arcs.filter((arc) => arc.endAngle - arc.startAngle > 0);
};

export const polarToCartesian = (radius: number, angle: number) => {
  const adjusted = angle - Math.PI / 2;
  return {
    x: Math.cos(adjusted) * radius,
    y: Math.sin(adjusted) * radius,
  };
};

export const buildArcPath = (
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): string => {
  const startOuter = polarToCartesian(outerRadius, startAngle);
  const endOuter = polarToCartesian(outerRadius, endAngle);
  const startInner = polarToCartesian(innerRadius, endAngle);
  const endInner = polarToCartesian(innerRadius, startAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  const path = [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
  ];

  if (innerRadius > 0) {
    path.push(`A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`);
  }
  path.push('Z');

  return path.join(' ');
};
