const BADGE_VARIANTS = new Set(['count', 'dot', 'progress']);
const BADGE_TONES = new Set(['accent', 'neutral', 'success', 'warning', 'danger']);
const DEFAULT_BADGE_TONE = 'accent';

const normalizeVariant = (value) => {
        if (typeof value !== 'string') return null;
        const normalized = value.trim().toLowerCase();
        return BADGE_VARIANTS.has(normalized) ? normalized : null;
};

const normalizeTone = (value) => {
        if (typeof value !== 'string') return DEFAULT_BADGE_TONE;
        const normalized = value.trim().toLowerCase();
        return BADGE_TONES.has(normalized) ? normalized : DEFAULT_BADGE_TONE;
};

const normalizeCountBadge = (badge) => {
        const value = Number(badge.value);
        if (!Number.isFinite(value)) return null;
        const normalizedValue = Math.max(0, Math.floor(value));
        const maxValueRaw = Number(badge.max);
        const maxValue = Number.isFinite(maxValueRaw) ? Math.max(1, Math.floor(maxValueRaw)) : 99;
        return {
                variant: 'count',
                value: normalizedValue,
                max: maxValue,
        };
};

const normalizeProgressBadge = (badge) => {
        const value = Number(badge.value);
        if (!Number.isFinite(value)) return null;
        const percent = value <= 1 ? value * 100 : value;
        const clamped = Math.max(0, Math.min(100, percent));
        // Round to a single decimal to avoid noisy updates while keeping smooth transitions.
        const rounded = Math.round(clamped * 10) / 10;
        return {
                variant: 'progress',
                value: rounded,
        };
};

export const normalizeTaskbarBadge = (badge) => {
        if (badge == null) return null;
        if (typeof badge !== 'object') return null;

        const variant = normalizeVariant(badge.variant || badge.type);
        if (!variant) return null;

        let core = null;
        if (variant === 'count') {
                core = normalizeCountBadge(badge);
        } else if (variant === 'progress') {
                core = normalizeProgressBadge(badge);
        } else {
                core = { variant: 'dot' };
        }

        if (!core) return null;

        const tone = normalizeTone(badge.tone);
        const normalized = { ...core, tone };

        if (typeof badge.ariaLabel === 'string' && badge.ariaLabel.trim()) {
                normalized.ariaLabel = badge.ariaLabel.trim();
        }

        return normalized;
};

const normalizeField = (value) => {
        if (value == null) return null;
        if (typeof value === 'string') {
                const trimmed = value.trim();
                return trimmed.length ? trimmed : null;
        }
        return value;
};

export const areTaskbarBadgesEqual = (a, b) => {
        if (a === b) return true;
        if (!a && !b) return true;
        if (!a || !b) return false;
        return (
                a.variant === b.variant &&
                normalizeField(a.value) === normalizeField(b.value) &&
                normalizeField(a.max) === normalizeField(b.max) &&
                normalizeField(a.tone) === normalizeField(b.tone) &&
                normalizeField(a.ariaLabel) === normalizeField(b.ariaLabel)
        );
};

export const getDefaultBadgeTone = () => DEFAULT_BADGE_TONE;

export const TASKBAR_BADGE_TONES = Array.from(BADGE_TONES);
