/** Deterministic pinball rules. All clocks are simulation seconds, never wall time. */
export type Phase = 'ready' | 'playing' | 'over';
export type HitKind = 'bumper' | 'target' | 'lane' | 'spinner' | 'sling';
export type DrainResult = 'ignore' | 'remove' | 'save' | 'next' | 'over';
export interface RuleState {
  phase: Phase;
  score: number;
  ballsRemaining: number;
  activeBalls: number;
  multiplier: number;
  combo: number;
  targetMask: number;
  laneMask: number;
  jackpotLit: boolean;
  ballSave: number;
  tilted: boolean;
  warnings: number;
  message: string;
}
export interface HitResult {
  points: number;
  multiball: boolean;
  kind: HitKind | 'jackpot';
}
export const MAX_BALLS = 3;
export const BALL_SAVE_SECONDS = 7;
export const initialRuleState = (): RuleState => ({
  phase: 'ready', score: 0, ballsRemaining: MAX_BALLS, activeBalls: 0,
  multiplier: 1, combo: 1, targetMask: 0, laneMask: 0, jackpotLit: false,
  ballSave: 0, tilted: false, warnings: 0, message: 'Launch to begin',
});
export const clamp = (value: number, min: number, max: number, fallback = min) =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));

export class PinballRules {
  private state = initialRuleState();
  private time = 0;
  private lastHit = -Infinity;
  private lastObject = '';
  private contacts = new Map<string, number>();
  private nudges: number[] = [];
  private lastNudge = -Infinity;
  private bankResetAt = Infinity;
  private saverAvailable = true;

  snapshot(): RuleState { return { ...this.state }; }

  reset(): void {
    this.state = initialRuleState();
    this.time = 0;
    this.lastHit = -Infinity;
    this.lastObject = '';
    this.contacts.clear();
    this.nudges = [];
    this.lastNudge = -Infinity;
    this.bankResetAt = Infinity;
    this.saverAvailable = true;
  }

  advance(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds <= 0 || this.state.phase !== 'playing') return;
    this.time += seconds;
    this.state.ballSave = Math.max(0, this.state.ballSave - seconds);
    if (this.time - this.lastHit > 2) this.state.combo = 1;
    this.nudges = this.nudges.filter((t) => this.time - t < 3);
    this.state.warnings = this.state.tilted ? 3 : this.nudges.length;
    if (this.time >= this.bankResetAt) {
      this.state.targetMask = 0;
      this.bankResetAt = Infinity;
    }
  }

  launch(): boolean {
    if (this.state.phase !== 'ready' || this.state.ballsRemaining <= 0) return false;
    this.state.phase = 'playing';
    this.state.activeBalls = 1;
    // A saved ball does not award a fresh, indefinitely renewable saver.
    this.state.ballSave = this.saverAvailable ? BALL_SAVE_SECONDS : 0;
    this.state.message = 'Complete the three targets to light JACKPOT';
    return true;
  }

  /** A weak shot that rolls down the shooter lane is not a lost life. */
  returnToShooter(): void {
    if (this.state.phase !== 'playing' || this.state.activeBalls !== 1) return;
    this.state.phase = 'ready';
    this.state.activeBalls = 0;
    this.state.message = 'Try a stronger launch';
  }

  nudge(): 'ignored' | 'nudge' | 'tilt' {
    if (this.state.phase !== 'playing' || this.state.tilted || this.time - this.lastNudge < 0.45) return 'ignored';
    this.lastNudge = this.time;
    this.nudges = this.nudges.filter((t) => this.time - t < 3);
    this.nudges.push(this.time);
    this.state.warnings = this.nudges.length;
    if (this.nudges.length >= 3) {
      this.state.tilted = true;
      this.state.ballSave = 0;
      this.state.combo = 1;
      this.state.message = 'TILT — flippers and scoring disabled until the next ball';
      return 'tilt';
    }
    this.state.message = `Nudge warning ${this.nudges.length}/3`;
    return 'nudge';
  }

  hit(kind: HitKind, id: number): HitResult {
    const empty: HitResult = { points: 0, multiball: false, kind };
    if (this.state.phase !== 'playing' || this.state.tilted || !Number.isInteger(id) || id < 0 || id > 2) return empty;
    const key = `${kind}:${id}`;
    const cooldown = kind === 'spinner' ? 0.35 : 0.12;
    if (this.time - (this.contacts.get(key) ?? -Infinity) < cooldown) return empty;
    if (kind === 'target' && (this.state.targetMask & (1 << id))) return empty;
    this.contacts.set(key, this.time);

    const major = kind === 'bumper' || kind === 'target' || kind === 'spinner';
    if (major) {
      this.state.combo = this.time - this.lastHit <= 2 && key !== this.lastObject
        ? Math.min(4, this.state.combo + 1) : 1;
      this.lastHit = this.time;
      this.lastObject = key;
    }
    let points = { bumper: 100, target: 250, lane: 150, spinner: 150, sling: 25 }[kind];
    let multiball = false;
    let resultKind: HitResult['kind'] = kind;
    if (kind === 'target') {
      this.state.targetMask |= 1 << id;
      if (this.state.targetMask === 7) {
        points += 1000;
        this.state.multiplier = Math.min(5, this.state.multiplier + 1);
        this.state.jackpotLit = true;
        this.bankResetAt = this.time + 1.5;
        this.state.message = 'JACKPOT LIT — hit the upper bumper';
      }
    }
    if (kind === 'lane') {
      this.state.laneMask |= 1 << id;
      if (this.state.laneMask === 7) {
        this.state.laneMask = 0;
        this.state.multiplier = Math.min(5, this.state.multiplier + 1);
        points += 1000;
        this.state.message = `All lanes lit — ${this.state.multiplier}× multiplier`;
      }
    }
    if (kind === 'bumper' && id === 0 && this.state.jackpotLit) {
      this.state.jackpotLit = false;
      points += 5000;
      resultKind = 'jackpot';
      if (this.state.activeBalls === 1) {
        this.state.activeBalls = 3;
        multiball = true;
      }
      this.state.message = multiball ? 'JACKPOT! Three-ball multiball' : 'JACKPOT! 5,000 bonus';
    }
    points *= this.state.multiplier * (major ? this.state.combo : 1);
    points = Math.min(points, 999999999 - this.state.score);
    this.state.score += points;
    return { points, multiball, kind: resultKind };
  }

  drain(): DrainResult {
    if (this.state.phase !== 'playing' || this.state.activeBalls <= 0) return 'ignore';
    if (this.state.activeBalls > 1) {
      this.state.activeBalls -= 1;
      return 'remove';
    }
    this.state.activeBalls = 0;
    this.state.phase = 'ready';
    if (this.state.ballSave > 0 && !this.state.tilted) {
      this.saverAvailable = false;
      this.state.ballSave = 0;
      this.state.message = 'BALL SAVED — launch again';
      return 'save';
    }
    this.state.ballsRemaining -= 1;
    this.state.ballSave = 0;
    this.state.combo = 1;
    this.state.multiplier = 1;
    this.state.targetMask = 0;
    this.state.laneMask = 0;
    this.state.jackpotLit = false;
    this.state.tilted = false;
    this.state.warnings = 0;
    this.contacts.clear();
    this.nudges = [];
    this.lastNudge = -Infinity;
    this.lastHit = -Infinity;
    this.lastObject = '';
    this.bankResetAt = Infinity;
    this.saverAvailable = true;
    if (this.state.ballsRemaining === 0) {
      this.state.phase = 'over';
      this.state.message = 'Game over — start a new game';
      return 'over';
    }
    this.state.message = 'Next ball ready';
    return 'next';
  }
}
