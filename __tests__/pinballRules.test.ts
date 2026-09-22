import { PinballRules, initialRuleState } from '../apps/pinball/rules';

describe('Pinball deterministic rules', () => {
  let rules: PinballRules;
  beforeEach(() => { rules = new PinballRules(); });
  const bank = () => { [0, 1, 2].forEach((id) => { rules.hit('target', id); rules.advance(0.2); }); };
  it('only launches once and ignores events before launch', () => {
    expect(rules.hit('bumper', 0).points).toBe(0);
    expect(rules.drain()).toBe('ignore');
    expect(rules.launch()).toBe(true);
    expect(rules.launch()).toBe(false);
    expect(rules.snapshot().activeBalls).toBe(1);
  });
  it('debounces contacts and chains different major shots only', () => {
    rules.launch();
    expect(rules.hit('bumper', 0).points).toBe(100);
    expect(rules.hit('bumper', 0).points).toBe(0);
    rules.advance(0.2);
    expect(rules.hit('bumper', 0).points).toBe(100);
    expect(rules.hit('bumper', 1).points).toBe(200);
    expect(rules.hit('bumper', 2).points).toBe(300);
    rules.advance(2.01);
    expect(rules.snapshot().combo).toBe(1);
  });
  it('caps combos and multipliers', () => {
    rules.launch();
    for (let cycle = 0; cycle < 20; cycle += 1) {
      [0, 1, 2].forEach((id) => { rules.hit('lane', id); rules.hit('bumper', id); rules.advance(0.2); });
    }
    expect(rules.snapshot()).toMatchObject({ multiplier: 5, combo: 4 });
  });
  it('makes a target bank a finite objective and resets it on simulation time', () => {
    rules.launch(); bank();
    expect(rules.snapshot()).toMatchObject({ targetMask: 7, jackpotLit: true, multiplier: 2 });
    expect(rules.hit('target', 0).points).toBe(0);
    rules.advance(1.5);
    expect(rules.snapshot().targetMask).toBe(0);
    expect(rules.hit('target', 0).points).toBeGreaterThan(0);
  });
  it('awards three-ball multiball without exceeding three live balls', () => {
    rules.launch(); bank();
    expect(rules.hit('bumper', 0).multiball).toBe(true);
    expect(rules.snapshot().activeBalls).toBe(3);
    rules.advance(1.5); bank();
    expect(rules.hit('bumper', 0).multiball).toBe(false);
    expect(rules.snapshot().activeBalls).toBe(3);
    expect(rules.drain()).toBe('remove');
    expect(rules.drain()).toBe('remove');
    expect(rules.snapshot().ballsRemaining).toBe(3);
  });
  it('does not renew the saver on a saved ball', () => {
    rules.launch(); rules.advance(1);
    expect(rules.drain()).toBe('save');
    expect(rules.drain()).toBe('ignore');
    rules.launch();
    expect(rules.snapshot().ballSave).toBe(0);
    expect(rules.drain()).toBe('next');
    rules.launch();
    expect(rules.snapshot().ballSave).toBe(7);
  });
  it('consumes exactly one life per final drain and ends after three lives', () => {
    for (let life = 0; life < 3; life += 1) {
      rules.launch(); rules.advance(8);
      expect(rules.drain()).toBe(life < 2 ? 'next' : 'over');
      expect(rules.drain()).toBe('ignore');
    }
    expect(rules.snapshot()).toMatchObject({ ballsRemaining: 0, phase: 'over', activeBalls: 0 });
    expect(rules.launch()).toBe(false);
  });
  it('throttles repeated nudges and disables scoring for the whole tilted ball', () => {
    rules.launch();
    expect(rules.nudge()).toBe('nudge');
    expect(rules.nudge()).toBe('ignored');
    rules.advance(0.5); rules.nudge(); rules.advance(0.5);
    expect(rules.nudge()).toBe('tilt');
    rules.advance(10);
    expect(rules.hit('bumper', 0).points).toBe(0);
    expect(rules.snapshot()).toMatchObject({ tilted: true, ballSave: 0 });
    expect(rules.drain()).toBe('next');
    expect(rules.snapshot().tilted).toBe(false);
  });
  it('expires old nudge warnings and protects a weak launch', () => {
    rules.launch(); rules.nudge(); rules.advance(3.1);
    expect(rules.snapshot().warnings).toBe(0);
    rules.returnToShooter();
    expect(rules.snapshot()).toMatchObject({ phase: 'ready', ballsRemaining: 3, activeBalls: 0 });
  });
  it('ignores invalid values and returns independent snapshots', () => {
    rules.launch();
    const before = rules.snapshot();
    [NaN, Infinity, -1].forEach((delta) => rules.advance(delta));
    [-1, 3, NaN, 1.2].forEach((id) => expect(rules.hit('target', id).points).toBe(0));
    expect(rules.snapshot()).toEqual(before);
    before.score = 999;
    expect(rules.snapshot().score).toBe(0);
  });
  it('fully resets score, clock-dependent rules, tilt and targets', () => {
    rules.launch(); bank(); rules.hit('bumper', 0); rules.nudge();
    rules.reset();
    expect(rules.snapshot()).toEqual(initialRuleState());
    rules.launch();
    expect(rules.hit('target', 0).points).toBe(250);
  });
});
