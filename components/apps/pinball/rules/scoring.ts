import { BUMPER_POINTS, COMBO_WINDOW_SECONDS, MULTIPLIER_MAX, SLINGSHOT_POINTS, TARGET_POINTS } from '../constants';

export type HitType = 'bumper' | 'slingshot' | 'target';

export class ScoreSystem {
  private score = 0;
  private multiplier = 1;
  private comboCount = 0;
  private lastBumperHitAt = -Infinity;
  private ballBonus = 0;

  onHit(type: HitType, nowSeconds: number): number {
    if (type === 'bumper') {
      if (nowSeconds - this.lastBumperHitAt <= COMBO_WINDOW_SECONDS) {
        this.comboCount += 1;
        this.multiplier = Math.min(MULTIPLIER_MAX, 1 + Math.floor(this.comboCount / 2));
      } else {
        this.comboCount = 1;
        this.multiplier = 1;
      }
      this.lastBumperHitAt = nowSeconds;
    }

    const base = type === 'bumper' ? BUMPER_POINTS : type === 'slingshot' ? SLINGSHOT_POINTS : TARGET_POINTS;
    const points = base * this.multiplier;
    this.score += points;
    this.ballBonus += Math.round(points * 0.1);
    return points;
  }

  endBallBonus(): number {
    const award = this.ballBonus;
    this.score += award;
    this.ballBonus = 0;
    this.comboCount = 0;
    this.multiplier = 1;
    this.lastBumperHitAt = -Infinity;
    return award;
  }

  getSnapshot() {
    return {
      score: this.score,
      multiplier: this.multiplier,
      comboCount: this.comboCount,
      ballBonus: this.ballBonus,
    };
  }

  resetGame() {
    this.score = 0;
    this.multiplier = 1;
    this.comboCount = 0;
    this.ballBonus = 0;
    this.lastBumperHitAt = -Infinity;
  }
}
