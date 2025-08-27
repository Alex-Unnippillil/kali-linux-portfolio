import { slide } from '../components/apps/2048';

describe('2048 merge mechanics', () => {
  it('merges adjacent tiles correctly', () => {
    expect(slide([2, 2, 0, 0])).toEqual([4, 0, 0, 0]);
    expect(slide([2, 2, 2, 2])).toEqual([4, 4, 0, 0]);
    expect(slide([4, 0, 4, 4])).toEqual([8, 4, 0, 0]);
  });
});
