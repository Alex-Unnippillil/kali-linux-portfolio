import {
  getActiveChapterIndex,
  parseChapters,
  seekToChapter,
} from '../../../apps/youtube/state/chapters';

describe('parseChapters', () => {
  it('parses JSON payloads and assigns metadata', () => {
    const json = JSON.stringify([
      { title: 'Intro', start: 0 },
      { title: 'Deep dive', start_time: 90 },
      { title: 'Wrap up', start: '02:00', code: 'KeyQ' },
    ]);

    const chapters = parseChapters(json);

    expect(chapters).toHaveLength(3);
    expect(chapters[0]).toMatchObject({
      title: 'Intro',
      start: 0,
      end: 90,
      key: '1',
      code: 'Digit1',
      shortcutLabel: '1',
      startLabel: '00:00',
    });
    expect(chapters[1]).toMatchObject({
      title: 'Deep dive',
      start: 90,
      end: 120,
      key: '2',
    });
    expect(chapters[2]).toMatchObject({
      title: 'Wrap up',
      start: 120,
      end: null,
      key: 'q',
      code: 'KeyQ',
      shortcutLabel: 'Q',
      startLabel: '02:00',
    });
  });

  it('parses time-coded text content', () => {
    const text = `00:00 Intro\n00:45 Setup - details\n1:02:03 Finale`;
    const chapters = parseChapters(text);

    expect(chapters.map((chapter) => chapter.start)).toEqual([0, 45, 3723]);
    expect(chapters[1].title).toBe('Setup - details');
    expect(getActiveChapterIndex(50, chapters)).toBe(1);
    expect(getActiveChapterIndex(4000, chapters)).toBe(2);
  });
});

describe('seekToChapter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('seeks immediately and schedules a fallback call', () => {
    const [, second] = parseChapters('00:00 Intro\n00:30 Details');
    const seekTo = jest.fn();
    const player = { seekTo };

    seekToChapter(player, second);

    expect(seekTo).toHaveBeenCalledTimes(1);
    expect(seekTo).toHaveBeenCalledWith(30, true);

    jest.advanceTimersByTime(74);
    expect(seekTo).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1);
    expect(seekTo).toHaveBeenCalledTimes(2);
    expect(seekTo).toHaveBeenLastCalledWith(30, true);
  });

  it('respects custom timing limits', () => {
    const chapters = parseChapters('00:00 Intro\n00:10 Scene');
    const seekTo = jest.fn();
    const player = { seekTo };

    seekToChapter(player, chapters[1], 40);
    expect(seekTo).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(39);
    expect(seekTo).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1);
    expect(seekTo).toHaveBeenCalledTimes(2);
  });
});
