"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';

const inferOrientation = () => {
  if (typeof window === 'undefined') return 'landscape-primary';
  const screenOrientation = window.screen?.orientation?.type;
  if (screenOrientation) return screenOrientation;
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia('(orientation: portrait)').matches
      ? 'portrait-primary'
      : 'landscape-primary';
  }
  return 'landscape-primary';
};

const matchesRequirement = (orientation, requirement) => {
  if (!requirement) return true;
  if (typeof orientation !== 'string') return false;
  return orientation.startsWith(requirement);
};

export default function useOrientationGuard({
  requiredOrientation,
  onRequireRotation,
  onOrientationMatch,
} = {}) {
  const [orientation, setOrientation] = useState(() => inferOrientation());

  const handleChange = useCallback(() => {
    setOrientation(inferOrientation());
  }, []);

  useEffect(() => {
    handleChange();
    window.addEventListener('orientationchange', handleChange);
    window.addEventListener('resize', handleChange);
    return () => {
      window.removeEventListener('orientationchange', handleChange);
      window.removeEventListener('resize', handleChange);
    };
  }, [handleChange]);

  const requirementSatisfied = useMemo(
    () => matchesRequirement(orientation, requiredOrientation),
    [orientation, requiredOrientation],
  );

  useEffect(() => {
    if (!requiredOrientation) return;
    if (requirementSatisfied) {
      onOrientationMatch?.(orientation);
    } else {
      onRequireRotation?.(orientation);
    }
  }, [orientation, onOrientationMatch, onRequireRotation, requirementSatisfied, requiredOrientation]);

  return {
    orientation,
    requiredOrientation,
    requirementSatisfied,
    requiresRotation: Boolean(requiredOrientation) && !requirementSatisfied,
  };
}
