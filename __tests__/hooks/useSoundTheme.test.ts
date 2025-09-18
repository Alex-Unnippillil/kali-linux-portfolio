import { CATEGORY_TO_BAND, DEFAULT_SOUND_THEME_ID, SOUND_THEMES, resolveTone } from '../../hooks/useSoundTheme';

describe('useSoundTheme tone mapping', () => {
  it('maps error notifications to a low tone band', () => {
    const tone = resolveTone(DEFAULT_SOUND_THEME_ID, 'error');
    expect(tone.band).toBe('low');
    expect(CATEGORY_TO_BAND.error).toBe('low');
  });

  it('maps warning notifications to a mid tone band', () => {
    const tone = resolveTone(DEFAULT_SOUND_THEME_ID, 'warning');
    expect(tone.band).toBe('mid');
    expect(CATEGORY_TO_BAND.warning).toBe('mid');
  });

  it('maps success notifications to a soft tone band', () => {
    const tone = resolveTone(DEFAULT_SOUND_THEME_ID, 'success');
    expect(tone.band).toBe('soft');
    expect(CATEGORY_TO_BAND.success).toBe('soft');
  });

  it('falls back to the default theme when an unknown theme is requested', () => {
    const expected = resolveTone(DEFAULT_SOUND_THEME_ID, 'info');
    const fallback = resolveTone('non-existent-theme', 'info');
    expect(fallback.frequency).toBe(expected.frequency);
    expect(fallback.waveform).toBe(expected.waveform);
    expect(fallback.volume).toBeCloseTo(expected.volume);
  });

  it('exposes preview amplitudes within the valid range', () => {
    SOUND_THEMES.forEach(theme => {
      theme.preview.forEach(preview => {
        expect(preview.amplitude).toBeGreaterThanOrEqual(0);
        expect(preview.amplitude).toBeLessThanOrEqual(1);
      });
    });
  });
});
