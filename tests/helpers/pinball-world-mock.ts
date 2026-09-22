import { PinballRules, type RuleState } from '../../apps/pinball/rules';
import type { PinballCallbacks } from '../../apps/pinball/physics';
export const constants = { WIDTH: 420, HEIGHT: 740, DEFAULT_LEFT_ANGLE: 0.38, DEFAULT_RIGHT_ANGLE: -0.38 };
let rules: PinballRules;
let callbacks: PinballCallbacks;
let world: ReturnType<typeof buildWorld>;
const emit = () => callbacks.onState?.(rules.snapshot());
function buildWorld() {
  return {
    step: jest.fn(), draw: jest.fn(), destroy: jest.fn(), setTheme: jest.fn(), setBounce: jest.fn(),
    setReducedMotion: jest.fn(), setFlipperPower: jest.fn(), setLeftFlipper: jest.fn(), setRightFlipper: jest.fn(),
    resetFlippers: jest.fn(), resetBall: jest.fn(),
    resetGame: jest.fn(() => { rules.reset(); emit(); }),
    launchBall: jest.fn(() => { rules.launch(); emit(); }),
    nudge: jest.fn(() => { rules.nudge(); emit(); }),
    isBallLocked: jest.fn(() => rules.snapshot().phase === 'ready'),
    inspect: jest.fn(() => ({ state: rules.snapshot(), balls: [], flippers: [], steps: 0, bodyCount: 0 })),
  };
}
export const createPinballWorld = jest.fn((_canvas: unknown, cb: PinballCallbacks) => {
  callbacks = cb; rules = new PinballRules(); world = buildWorld(); emit(); return world;
});
export const __world = () => world;
export const __rules = () => rules;
export const __emit = () => emit();
export const __state = (patch: Partial<RuleState>) => callbacks.onState?.({ ...rules.snapshot(), ...patch });
