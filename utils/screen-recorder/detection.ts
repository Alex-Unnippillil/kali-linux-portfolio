export type SplitReason = 'silence' | 'motion';

export interface DetectionSample {
    timestamp: number;
    audioLevel: number;
    motionScore: number;
}

export interface DetectionOptions {
    silenceThreshold: number;
    motionThreshold: number;
    minDuration: number;
}

export interface SplitPoint {
    time: number;
    reasons: SplitReason[];
}

export interface Segment {
    id: string;
    start: number;
    end: number;
    triggers: SplitReason[];
}

export interface SegmentState {
    segments: Segment[];
    splits: SplitPoint[];
}

const cloneSegments = (segments: Segment[]): Segment[] => segments.map((segment) => ({ ...segment, triggers: [...segment.triggers] }));

const cloneState = (state: SegmentState): SegmentState => ({
    segments: cloneSegments(state.segments),
    splits: state.splits.map((split) => ({ time: split.time, reasons: [...split.reasons] })),
});

const appendReason = (splits: SplitPoint[], time: number, reason: SplitReason, tolerance = 200) => {
    const last = splits[splits.length - 1];
    if (last && Math.abs(last.time - time) <= tolerance) {
        if (!last.reasons.includes(reason)) {
            last.reasons = [...last.reasons, reason];
        }
        return;
    }
    splits.push({ time, reasons: [reason] });
};

export const detectSplitPoints = (samples: DetectionSample[], options: DetectionOptions): SplitPoint[] => {
    if (!samples.length) {
        return [];
    }

    const splits: SplitPoint[] = [];
    let silenceStart: number | null = null;
    let motionStart: number | null = null;
    let silenceCommitted = false;
    let motionCommitted = false;

    for (const sample of samples) {
        if (sample.audioLevel <= options.silenceThreshold) {
            if (silenceStart === null) {
                silenceStart = sample.timestamp;
            }
            if (!silenceCommitted && sample.timestamp - silenceStart >= options.minDuration) {
                appendReason(splits, sample.timestamp, 'silence');
                silenceCommitted = true;
            }
        } else {
            silenceStart = null;
            silenceCommitted = false;
        }

        if (sample.motionScore <= options.motionThreshold) {
            if (motionStart === null) {
                motionStart = sample.timestamp;
            }
            if (!motionCommitted && sample.timestamp - motionStart >= options.minDuration) {
                appendReason(splits, sample.timestamp, 'motion');
                motionCommitted = true;
            }
        } else {
            motionStart = null;
            motionCommitted = false;
        }
    }

    return splits;
};

export const buildSegments = (duration: number, splits: SplitPoint[]): Segment[] => {
    if (duration <= 0) {
        return [];
    }

    const boundedSplits = splits
        .filter((split) => split.time > 0 && split.time < duration)
        .sort((a, b) => a.time - b.time);

    const segments: Segment[] = [];
    let cursor = 0;

    boundedSplits.forEach((split, index) => {
        segments.push({
            id: `segment-${index}`,
            start: cursor,
            end: split.time,
            triggers: [...split.reasons],
        });
        cursor = split.time;
    });

    segments.push({
        id: `segment-${boundedSplits.length}`,
        start: cursor,
        end: duration,
        triggers: [],
    });

    return segments;
};

export const mergeSegments = (segments: Segment[], index: number): Segment[] => {
    if (index < 0 || index >= segments.length - 1) {
        return segments;
    }

    const merged: Segment = {
        id: segments[index].id,
        start: segments[index].start,
        end: segments[index + 1].end,
        triggers: [],
    };

    const nextSegments = [...segments.slice(0, index), merged, ...segments.slice(index + 2)].map((segment, idx) => ({
        ...segment,
        id: `segment-${idx}`,
    }));

    return nextSegments;
};

export class SegmentHistory {
    private stack: SegmentState[] = [];

    private index = -1;

    push(state: SegmentState) {
        const snapshot = cloneState(state);
        this.stack = [...this.stack.slice(0, this.index + 1), snapshot];
        this.index = this.stack.length - 1;
    }

    undo(): SegmentState | null {
        if (this.index <= 0) {
            return null;
        }
        this.index -= 1;
        return cloneState(this.stack[this.index]);
    }

    reset() {
        this.stack = [];
        this.index = -1;
    }

    canUndo(): boolean {
        return this.index > 0;
    }
}
