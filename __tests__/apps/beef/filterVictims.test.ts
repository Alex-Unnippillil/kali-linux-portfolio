import { PRELOADED_VICTIMS } from '../../../apps/beef/data/victims';
import { filterVictimsByTags } from '../../../apps/beef/utils/filterVictims';

describe('filterVictimsByTags', () => {
  it('returns all victims when no tags are selected', () => {
    const result = filterVictimsByTags(PRELOADED_VICTIMS, []);
    expect(result).toHaveLength(PRELOADED_VICTIMS.length);
  });

  it('filters victims by a single tag', () => {
    const result = filterVictimsByTags(PRELOADED_VICTIMS, ['priority']);
    const ids = result.map((victim) => victim.id);
    expect(ids).toEqual(expect.arrayContaining(['vic-001', 'vic-003']));
    expect(ids).not.toContain('vic-004');
  });

  it('requires victims to match all selected tags', () => {
    const result = filterVictimsByTags(PRELOADED_VICTIMS, ['internal', 'tablet']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('vic-002');
  });

  it('normalizes tag casing and whitespace before filtering', () => {
    const result = filterVictimsByTags(PRELOADED_VICTIMS, ['  PRIORITY  ', 'TrAveL']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('vic-003');
  });
});
