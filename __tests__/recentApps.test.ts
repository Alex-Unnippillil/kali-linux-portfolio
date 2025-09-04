import { addRecentApp } from '../utils/recentApps';

describe('addRecentApp', () => {
  it('moves apps to front without duplicates', () => {
    let list: string[] = [];
    list = addRecentApp(list, 'a');
    expect(list).toEqual(['a']);
    list = addRecentApp(list, 'b');
    expect(list).toEqual(['b', 'a']);
    list = addRecentApp(list, 'a');
    expect(list).toEqual(['a', 'b']);
  });

  it('limits the list to 10 entries', () => {
    let list: string[] = [];
    for (let i = 0; i < 10; i++) {
      list = addRecentApp(list, `app${i}`);
    }
    expect(list.length).toBe(10);
    list = addRecentApp(list, 'new');
    expect(list.length).toBe(10);
    expect(list[0]).toBe('new');
    expect(list.includes('app0')).toBe(false);
  });
});
