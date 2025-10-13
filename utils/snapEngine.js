const EDGE_THRESHOLD_MIN = 48;
const EDGE_THRESHOLD_MAX = 160;
const EDGE_THRESHOLD_RATIO = 0.05;

const clamp = (value, min, max) => {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const resolvePointer = (event, data) => {
  if (event && typeof event === 'object') {
    if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
      return { x: event.clientX, y: event.clientY };
    }
    if (event.changedTouches && event.changedTouches.length > 0) {
      const touch = event.changedTouches[0];
      if (touch && typeof touch.clientX === 'number' && typeof touch.clientY === 'number') {
        return { x: touch.clientX, y: touch.clientY };
      }
    }
  }

  if (data && typeof data === 'object') {
    const { clientX, clientY, lastX, lastY } = data;
    if (typeof clientX === 'number' && typeof clientY === 'number') {
      return { x: clientX, y: clientY };
    }
    if (typeof lastX === 'number' && typeof lastY === 'number') {
      return { x: lastX, y: lastY };
    }
  }

  return null;
};

const resolveSnapFromEdges = (pointer, viewport = {}) => {
  if (!pointer) return null;
  const width = typeof viewport.width === 'number' ? viewport.width : 0;
  const height = typeof viewport.height === 'number' ? viewport.height : 0;
  if (width <= 0 || height <= 0) return null;

  const topInset = typeof viewport.topInset === 'number' ? viewport.topInset : 0;
  const bottomInset = typeof viewport.bottomInset === 'number' ? viewport.bottomInset : 0;

  const thresholdX = clamp(width * EDGE_THRESHOLD_RATIO, EDGE_THRESHOLD_MIN, EDGE_THRESHOLD_MAX);
  const thresholdY = clamp(height * EDGE_THRESHOLD_RATIO, EDGE_THRESHOLD_MIN, EDGE_THRESHOLD_MAX);

  const withinLeft = pointer.x <= thresholdX;
  const withinRight = pointer.x >= width - thresholdX;
  const withinTop = pointer.y <= Math.max(topInset, thresholdY);
  const withinBottom = pointer.y >= height - Math.max(bottomInset, thresholdY);

  if (withinTop && withinLeft) return 'top-left';
  if (withinTop && withinRight) return 'top-right';
  if (withinBottom && withinLeft) return 'bottom-left';
  if (withinBottom && withinRight) return 'bottom-right';
  if (withinLeft) return 'left';
  if (withinRight) return 'right';
  if (withinTop) return 'top';

  return null;
};

export const SnapEngine = {
  resolve({ event = null, data = null, preview = null, snap = null, viewport = {} } = {}) {
    if (snap) {
      return snap;
    }

    if (preview && typeof preview === 'object' && typeof preview.position === 'string') {
      return preview.position;
    }

    const pointer = resolvePointer(event, data);
    return resolveSnapFromEdges(pointer, viewport);
  },
};

export default SnapEngine;
