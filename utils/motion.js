const MOTION_VARS = {
    fast: '--motion-fast',
    medium: '--motion-medium',
    slow: '--motion-slow',
};

const FALLBACKS = {
    fast: 150,
    medium: 300,
    slow: 500,
};

function documentElement() {
    if (typeof document === 'undefined') return null;
    return document.documentElement || null;
}

export function shouldReduceMotion() {
    if (typeof window === 'undefined') return false;
    const root = documentElement();
    if (root && root.classList && root.classList.contains('reduced-motion')) {
        return true;
    }
    if (typeof window.matchMedia === 'function') {
        try {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) {
            return false;
        }
    }
    return false;
}

export function getMotionDuration(token = 'fast') {
    const fallback = FALLBACKS[token] ?? FALLBACKS.fast;
    if (shouldReduceMotion()) {
        return 0;
    }
    if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
        return fallback;
    }
    const root = documentElement();
    if (!root) {
        return fallback;
    }
    try {
        const computed = window.getComputedStyle(root);
        const cssVar = MOTION_VARS[token] || MOTION_VARS.fast;
        const raw = computed.getPropertyValue(cssVar).trim();
        const parsed = parseFloat(raw);
        if (Number.isNaN(parsed)) {
            return fallback;
        }
        return parsed;
    } catch (e) {
        return fallback;
    }
}

export function clampDuration(duration, max = 180) {
    if (typeof duration !== 'number' || Number.isNaN(duration)) {
        return Math.min(FALLBACKS.fast, max);
    }
    return duration > max ? max : duration;
}

export const __motionTestUtils = {
    MOTION_VARS,
    FALLBACKS,
};
