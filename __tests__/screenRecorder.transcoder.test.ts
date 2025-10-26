import {
    calculateReduction,
    detectCapabilities,
    handlePipelineError,
    selectPipeline,
    supportsWebCodecs,
    type CapabilityReport,
} from '../components/apps/screen-recorder/Transcoder';

describe('screen recorder transcoder capability helpers', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    afterAll(() => {
        warnSpy.mockRestore();
    });

    it('detects lack of WebCodecs when window is undefined', () => {
        expect(supportsWebCodecs(undefined as unknown as Window & typeof globalThis)).toBe(false);
    });

    it('detects WebCodecs support when primitives exist', () => {
        const fakeWindow = {
            VideoFrame: function VideoFrame() {},
            MediaStreamTrackGenerator: function MediaStreamTrackGenerator() {},
            Worker: function Worker() {},
            createImageBitmap: () => Promise.resolve({}),
        } as unknown as Window & typeof globalThis;
        expect(supportsWebCodecs(fakeWindow)).toBe(true);
    });

    it('selects the WebCodecs pipeline when supported', () => {
        const capabilities: CapabilityReport = { webCodecs: true, mediaRecorder: true, worker: true };
        expect(selectPipeline(capabilities)).toBe('webcodecs');
    });

    it('falls back to MediaRecorder when WebCodecs are unavailable', () => {
        const capabilities: CapabilityReport = { webCodecs: false, mediaRecorder: true, worker: false };
        expect(selectPipeline(capabilities)).toBe('media-recorder');
    });

    it('throws when no pipeline is available', () => {
        const capabilities: CapabilityReport = { webCodecs: false, mediaRecorder: false, worker: false };
        expect(() => selectPipeline(capabilities)).toThrow('No supported transcoding pipeline available.');
    });

    it('falls back to media-recorder pipeline after WebCodecs error', () => {
        const capabilities: CapabilityReport = { webCodecs: true, mediaRecorder: true, worker: true };
        expect(handlePipelineError(capabilities, new Error('boom'))).toBe('media-recorder');
    });

    it('calculates size reduction ratios', () => {
        const reduction = calculateReduction(100, 60);
        expect(reduction).toBeCloseTo(0.4);
    });
});

describe('capability detection snapshot', () => {
    it('maps properties off the real window safely', () => {
        const capabilities = detectCapabilities({} as Window & typeof globalThis);
        expect(capabilities).toMatchObject({
            webCodecs: false,
            mediaRecorder: false,
            worker: false,
        });
    });
});
