import {
    buildSegments,
    detectSplitPoints,
    DetectionSample,
    mergeSegments,
    SegmentHistory,
} from '../utils/screen-recorder/detection';

describe('screen recorder detection', () => {
    const options = {
        silenceThreshold: 0.01,
        motionThreshold: 5,
        minDuration: 1500,
    };

    const createSamples = (): DetectionSample[] => {
        const samples: DetectionSample[] = [];
        for (let timestamp = 0; timestamp <= 10000; timestamp += 500) {
            const audioLevel = timestamp >= 2000 && timestamp < 4000 ? 0.002 : 0.05;
            const motionScore = timestamp >= 6000 && timestamp < 8000 ? 2 : 20;
            samples.push({ timestamp, audioLevel, motionScore });
        }
        return samples;
    };

    it('detects silence and motion driven split points', () => {
        const samples = createSamples();
        const splits = detectSplitPoints(samples, options);

        expect(splits).toHaveLength(2);
        expect(splits[0]).toMatchObject({ reasons: ['silence'] });
        expect(Math.round(splits[0].time)).toBe(3500);
        expect(splits[1]).toMatchObject({ reasons: ['motion'] });
        expect(Math.round(splits[1].time)).toBe(7500);

        const segments = buildSegments(10000, splits);
        expect(segments).toHaveLength(3);
        expect(segments[0]).toMatchObject({ start: 0, end: 3500, triggers: ['silence'] });
        expect(segments[1]).toMatchObject({ start: 3500, end: 7500, triggers: ['motion'] });
        expect(segments[2]).toMatchObject({ start: 7500, end: 10000, triggers: [] });
    });

    it('combines triggers that fire simultaneously', () => {
        const samples: DetectionSample[] = [];
        for (let timestamp = 0; timestamp <= 4000; timestamp += 500) {
            const quiet = timestamp >= 1000;
            samples.push({
                timestamp,
                audioLevel: quiet ? 0.002 : 0.2,
                motionScore: quiet ? 1 : 25,
            });
        }
        const splits = detectSplitPoints(samples, options);
        expect(splits).toHaveLength(1);
        expect(splits[0].reasons.sort()).toEqual(['motion', 'silence']);
    });

    it('merges adjacent segments and clears triggers', () => {
        const samples = createSamples();
        const splits = detectSplitPoints(samples, options);
        const segments = buildSegments(10000, splits);
        const merged = mergeSegments(segments, 1);

        expect(merged).toHaveLength(2);
        expect(merged[1]).toMatchObject({ start: 3500, end: 10000, triggers: [] });
    });

    it('tracks history and supports undo', () => {
        const history = new SegmentHistory();
        const samples = createSamples();
        const splits = detectSplitPoints(samples, options);
        const segments = buildSegments(10000, splits);
        history.push({ segments, splits });

        const merged = mergeSegments(segments, 0);
        history.push({ segments: merged, splits: splits.slice(1) });

        expect(history.canUndo()).toBe(true);
        const previous = history.undo();
        expect(previous?.segments).toHaveLength(3);
        expect(previous?.splits).toHaveLength(2);
        expect(history.canUndo()).toBe(false);
    });
});
