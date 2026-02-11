export type Vec2 = { x: number; y: number };

export type Bumper = { id: string; position: Vec2; radius: number; flash: number };
export type Sling = { id: string; center: Vec2; size: Vec2; flash: number; impulse: Vec2 };
export type Target = { id: string; position: Vec2; size: Vec2; active: boolean; cooldown: number };

export interface PinballSettings {
  reducedMotion: boolean;
  masterVolume: number;
  muted: boolean;
}

export interface HighScoreEntry {
  name: string;
  score: number;
  createdAt: number;
}

export interface EngineSnapshot {
  score: number;
  multiplier: number;
  comboCount: number;
  currentBall: number;
  ballsRemaining: number;
  ballSaveRemaining: number;
  plungerCharge: number;
  paused: boolean;
  gameOver: boolean;
  tiltWarnings: number;
  tiltActive: boolean;
  statusMessage: string;
  debug: {
    fps: number;
    physicsMs: number;
    contacts: number;
    bodies: number;
  };
}

export type InputAction =
  | 'flipper_left_down'
  | 'flipper_left_up'
  | 'flipper_right_down'
  | 'flipper_right_up'
  | 'plunger_down'
  | 'plunger_up'
  | 'pause_toggle'
  | 'nudge_left'
  | 'nudge_right'
  | 'nudge_up';
