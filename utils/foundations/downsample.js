// FND-02 — Largest Triangle Three Buckets downsampling helper
// Derived from the general LTTB algorithm with accessor support so charts
// can reuse it without reshaping their data first.

const defaultGetX = (point) => point?.x ?? 0;
const defaultGetY = (point) => point?.y ?? 0;

export const downsampleLTTB = (
  data,
  threshold,
  getX = defaultGetX,
  getY = defaultGetY
) => {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  const size = data.length;
  if (threshold == null || threshold <= 0 || threshold >= size) {
    return data.slice();
  }

  if (threshold === 1) {
    return [data[Math.floor(size / 2)]];
  }

  if (threshold === 2) {
    return [data[0], data[size - 1]];
  }

  const sampled = [];
  let a = 0;
  sampled.push(data[a]);

  const every = (size - 2) / (threshold - 2);

  for (let i = 0; i < threshold - 2; i += 1) {
    const rangeStart = Math.floor((i + 1) * every) + 1;
    const rangeEnd = Math.min(Math.floor((i + 2) * every) + 1, size);

    let avgX = 0;
    let avgY = 0;
    const rangeLength = rangeEnd - rangeStart;

    if (rangeLength > 0) {
      for (let j = rangeStart; j < rangeEnd; j += 1) {
        avgX += getX(data[j]);
        avgY += getY(data[j]);
      }

      avgX /= rangeLength;
      avgY /= rangeLength;
    } else {
      const fallbackIndex = Math.min(rangeStart, size - 1);
      avgX = getX(data[fallbackIndex]);
      avgY = getY(data[fallbackIndex]);
    }

    const bucketStart = Math.floor(i * every) + 1;
    const bucketEnd = Math.min(Math.floor((i + 1) * every) + 1, size - 1);

    const pointAX = getX(data[a]);
    const pointAY = getY(data[a]);
    let maxArea = -1;
    let nextA = bucketStart;

    for (let j = bucketStart; j < bucketEnd; j += 1) {
      const pointBX = getX(data[j]);
      const pointBY = getY(data[j]);

      const area = Math.abs(
        (pointAX - avgX) * (pointBY - pointAY) -
          (pointAX - pointBX) * (avgY - pointAY)
      );

      if (area > maxArea) {
        maxArea = area;
        nextA = j;
      }
    }

    sampled.push(data[nextA]);
    a = nextA;
  }

  sampled.push(data[size - 1]);
  return sampled;
};

