import {
  parseChapterMetadata,
  getChapterActionFromKey,
} from '../utils/youtubeChapters';

describe('parseChapterMetadata', () => {
  it('parses JSON string metadata into sorted chapters', () => {
    const metadata = JSON.stringify([
      { title: 'Intro', start: '00:00' },
      { title: 'Deep Dive', startTime: '1:30' },
      { title: 'Wrap', start_time: 240 },
    ]);
    const chapters = parseChapterMetadata(metadata);
    expect(chapters).toEqual([
      { title: 'Intro', startTime: 0 },
      { title: 'Deep Dive', startTime: 90 },
      { title: 'Wrap', startTime: 240 },
    ]);
  });

  it('parses newline separated timestamp text', () => {
    const metadata = '00:00 Intro\n01:45 - Threat models\n3:10  Closing';
    const chapters = parseChapterMetadata(metadata);
    expect(chapters).toEqual([
      { title: 'Intro', startTime: 0 },
      { title: 'Threat models', startTime: 105 },
      { title: 'Closing', startTime: 190 },
    ]);
  });

  it('parses objects with nested chapters arrays', () => {
    const metadata = {
      chapters: [
        { name: 'Setup', time: '45' },
        { title: 'Execution', start_time: '90' },
      ],
    };
    const chapters = parseChapterMetadata(metadata);
    expect(chapters).toEqual([
      { title: 'Setup', startTime: 45 },
      { title: 'Execution', startTime: 90 },
    ]);
  });
});

describe('getChapterActionFromKey', () => {
  const chapters = [
    { title: 'Intro', startTime: 0 },
    { title: 'Middle', startTime: 60 },
    { title: 'End', startTime: 120 },
  ];

  it('toggles chapter drawer with c key', () => {
    expect(
      getChapterActionFromKey({ key: 'c', chapters, currentTime: 10 })
    ).toEqual({ type: 'toggle' });
    expect(
      getChapterActionFromKey({ key: 'C', chapters, currentTime: 10 })
    ).toEqual({ type: 'toggle' });
  });

  it('seeks to previous and next chapters with brackets', () => {
    expect(
      getChapterActionFromKey({ key: '[', chapters, currentTime: 80 })
    ).toEqual({ type: 'seek', index: 0, time: 0 });
    expect(
      getChapterActionFromKey({ key: ']', chapters, currentTime: 80 })
    ).toEqual({ type: 'seek', index: 2, time: 120 });
  });

  it('seeks directly to numbered chapters', () => {
    expect(
      getChapterActionFromKey({ key: '1', chapters, currentTime: 0 })
    ).toEqual({ type: 'seek', index: 0, time: 0 });
    expect(
      getChapterActionFromKey({ key: '0', chapters, currentTime: 0 })
    ).toEqual({ type: 'seek', index: 2, time: 120 });
    expect(
      getChapterActionFromKey({ key: '9', chapters, currentTime: 0 })
    ).toBeNull();
  });

  it('returns null when no chapters are available', () => {
    expect(
      getChapterActionFromKey({ key: 'c', chapters: [], currentTime: 0 })
    ).toBeNull();
  });
});
