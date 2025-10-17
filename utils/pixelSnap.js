export const getEffectiveDevicePixelRatio = () => {
  if (typeof window === 'undefined') {
    return 1;
  }

  const ratio = window.devicePixelRatio;
  if (typeof ratio !== 'number' || !Number.isFinite(ratio) || ratio <= 0) {
    return 1;
  }

  return ratio;
};

export const snapToDevicePixels = (value, ratio = getEffectiveDevicePixelRatio()) => {
  if (typeof value !== 'number') {
    const parsed = typeof value === 'string' ? parseFloat(value) : Number.NaN;
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    value = parsed;
  }

  if (!Number.isFinite(value)) {
    return 0;
  }

  const safeRatio = typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  return Math.round(value * safeRatio) / safeRatio;
};

