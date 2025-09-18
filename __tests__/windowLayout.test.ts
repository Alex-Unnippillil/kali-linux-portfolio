import { computeWindowLayout } from '../utils/windowLayout';

describe('computeWindowLayout', () => {
  it('returns an empty map when no windows are provided', () => {
    expect(computeWindowLayout([], 'horizontal')).toEqual({});
  });

  it('tiles windows horizontally with even spacing', () => {
    const ids = ['one', 'two', 'three', 'four'];
    const layout = computeWindowLayout(ids, 'horizontal');

    const firstWidth = layout[ids[0]].width;
    ids.forEach((id) => {
      expect(layout[id].width).toBeCloseTo(firstWidth, 5);
      expect(layout[id].height).toBeCloseTo(1, 5);
      expect(layout[id].y).toBeCloseTo(0, 5);
    });

    for (let i = 0; i < ids.length - 1; i += 1) {
      const current = layout[ids[i]];
      const next = layout[ids[i + 1]];
      expect(next.x - current.x).toBeCloseTo(firstWidth, 5);
    }
  });

  it('tiles windows vertically with even spacing', () => {
    const ids = ['alpha', 'beta', 'gamma'];
    const layout = computeWindowLayout(ids, 'vertical');

    const firstHeight = layout[ids[0]].height;
    ids.forEach((id) => {
      expect(layout[id].height).toBeCloseTo(firstHeight, 5);
      expect(layout[id].width).toBeCloseTo(1, 5);
      expect(layout[id].x).toBeCloseTo(0, 5);
    });

    for (let i = 0; i < ids.length - 1; i += 1) {
      const current = layout[ids[i]];
      const next = layout[ids[i + 1]];
      expect(next.y - current.y).toBeCloseTo(firstHeight, 5);
    }
  });

  it('respects uniform margins in the layout', () => {
    const ids = ['left', 'right'];
    const margin = 0.05;
    const layout = computeWindowLayout(ids, 'horizontal', { margin });

    const expectedWidth = (1 - margin * 2) / ids.length;
    expect(layout[ids[0]].x).toBeCloseTo(margin, 5);
    expect(layout[ids[0]].width).toBeCloseTo(expectedWidth, 5);
    expect(layout[ids[0]].height).toBeCloseTo(1 - margin * 2, 5);
    expect(layout[ids[1]].x + layout[ids[1]].width).toBeCloseTo(1 - margin, 5);
  });

  it('supports directional margins', () => {
    const ids = ['top', 'bottom'];
    const layout = computeWindowLayout(ids, 'vertical', {
      margin: { top: 0.1, bottom: 0.05, left: 0.02, right: 0.03 },
    });

    const expectedHeight = (1 - 0.1 - 0.05) / ids.length;
    expect(layout[ids[0]].y).toBeCloseTo(0.1, 5);
    expect(layout[ids[0]].height).toBeCloseTo(expectedHeight, 5);
    expect(layout[ids[0]].x).toBeCloseTo(0.02, 5);
    expect(layout[ids[0]].width).toBeCloseTo(1 - 0.02 - 0.03, 5);
    expect(layout[ids[1]].y + layout[ids[1]].height).toBeCloseTo(1 - 0.05, 5);
  });
});
