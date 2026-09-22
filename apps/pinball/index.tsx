'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useGamePersistence } from '../../components/apps/useGameControls';
import { consumeGameKey, shouldHandleGameKey } from '../../utils/gameInput';
import { createPinballWorld, constants, type PinballWorld } from './physics';
import { initialRuleState, clamp, type RuleState } from './rules';
import { THEMES } from './table';
import { createPinballAudio } from './audio';
import styles from './pinball.module.css';

type Side = 'left' | 'right';
type DialogKind = 'help' | 'settings' | 'reset' | null;
export type PinballProps = { windowMeta?: { isFocused?: boolean; isMinimized?: boolean } };
const scoreText = (score: number) => String(Math.max(0, Math.floor(score))).padStart(6, '0');
const keySide = (code: string): Side | null => ['ArrowLeft', 'KeyA'].includes(code) ? 'left'
  : ['ArrowRight', 'KeyD'].includes(code) ? 'right' : null;

function GameDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button, input, select')?.focus();
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <div className={styles.scrim}>
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} className={styles.dialog}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape') { event.preventDefault(); onClose(); }
        if (event.key !== 'Tab') return;
        const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, [tabindex="0"]') || []);
        const first = items[0]; const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
      <div className={styles.dialogHeading}><h2 id={id}>{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog">×</button></div>
      {children}
    </div>
  </div>;
}

export default function Pinball({ windowMeta }: PinballProps) {
  const isFocused = (windowMeta?.isFocused ?? true) && !windowMeta?.isMinimized;
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<PinballWorld | null>(null);
  const audioRef = useRef<ReturnType<typeof createPinballAudio> | null>(null);
  const stateRef = useRef<RuleState>(initialRuleState());
  const activeRef = useRef(false);
  const focusRef = useRef(isFocused);
  const sources = useRef({ left: new Set<string>(), right: new Set<string>() });
  const pulseTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const chargeRef = useRef<{ source: string; start: number } | null>(null);
  const gamepadRef = useRef({ launch: false, nudge: false, armed: false });
  const [state, setState] = useState(initialRuleState);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [error, setError] = useState('');
  const [pressed, setPressed] = useState({ left: false, right: false });
  const [charge, setCharge] = useState(0);
  const [size, setSize] = useState({ width: 260, height: 458 });
  const [theme, setTheme] = useState('space');
  const [power, setPower] = useState(1);
  const [bounce, setBounce] = useState(0.5);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highScore, setHighScoreState] = useState(0);
  const { getHighScore, setHighScore } = useGamePersistence('pinball');
  const hydrated = useRef(false);
  const canRun = ready && !paused && isFocused && !dialog && !error && state.phase !== 'over';
  activeRef.current = Boolean(canRun);
  focusRef.current = isFocused;

  const clearControls = useCallback((updateUi = true) => {
    sources.current.left.clear(); sources.current.right.clear();
    chargeRef.current = null;
    pulseTimers.current.forEach(clearTimeout); pulseTimers.current.clear();
    gamepadRef.current = { launch: false, nudge: false, armed: false };
    worldRef.current?.resetFlippers();
    if (updateUi) { setPressed({ left: false, right: false }); setCharge(0); }
  }, []);
  const pause = useCallback(() => {
    activeRef.current = false;
    clearControls(); audioRef.current?.suspend(); setPaused(true);
  }, [clearControls]);
  const resume = useCallback(() => {
    if (!focusRef.current || document.hidden) return;
    audioRef.current?.unlock(); setPaused(false);
  }, []);
  const applyFlipper = useCallback((side: Side, source: string, down: boolean) => {
    const held = sources.current[side];
    if (down && (!activeRef.current || stateRef.current.tilted)) return;
    if (held.has(source) === down) return;
    if (down) { held.add(source); audioRef.current?.unlock(); } else held.delete(source);
    const on = held.size > 0;
    if (side === 'left') worldRef.current?.setLeftFlipper(on ? -Math.PI / 4 : constants.DEFAULT_LEFT_ANGLE);
    else worldRef.current?.setRightFlipper(on ? Math.PI / 4 : constants.DEFAULT_RIGHT_ANGLE);
    setPressed((previous) => previous[side] === on ? previous : { ...previous, [side]: on });
  }, []);
  const launch = useCallback((value = 0.8) => {
    if (!activeRef.current || stateRef.current.phase !== 'ready') return;
    audioRef.current?.unlock(); worldRef.current?.launchBall(value);
  }, []);
  const startCharge = useCallback((source: string) => {
    if (!activeRef.current || stateRef.current.phase !== 'ready' || chargeRef.current) return;
    chargeRef.current = { source, start: performance.now() };
    audioRef.current?.unlock(); setCharge(0.01);
  }, []);
  const cancelCharge = useCallback(() => { chargeRef.current = null; setCharge(0); }, []);
  const finishCharge = useCallback((source: string) => {
    if (chargeRef.current?.source !== source) return;
    const duration = performance.now() - chargeRef.current.start;
    cancelCharge();
    launch(duration < 150 ? 0.8 : clamp(0.4 + (duration - 150) / 900, 0.4, 1.4, 0.8));
  }, [cancelCharge, launch]);
  const nudge = useCallback(() => {
    if (!activeRef.current || stateRef.current.phase !== 'playing') return;
    audioRef.current?.unlock(); worldRef.current?.nudge();
  }, []);
  const reset = useCallback(() => {
    clearControls(); setDialog(null); worldRef.current?.resetGame();
    setPaused(!focusRef.current || document.hidden);
  }, [clearControls]);
  const openDialog = useCallback((kind: DialogKind) => { pause(); setDialog(kind); }, [pause]);

  useEffect(() => {
    let best = getHighScore();
    if (!Number.isFinite(best) || best < 0 || best > 999999999) {
      best = 0;
      try { localStorage.removeItem('highscore:pinball'); } catch { /* Storage can be unavailable. */ }
    }
    try {
      // Preserve scores from the former desktop implementation without deleting its layouts.
      const legacy = JSON.parse(localStorage.getItem('pinball-highscores') || '{}');
      if (legacy && typeof legacy === 'object') Object.values(legacy).forEach((value) => {
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 999999999) best = Math.max(best, value);
      });
      const settings = JSON.parse(localStorage.getItem('pinball-settings-v2') || '{}');
      if (settings && typeof settings === 'object') {
        if (typeof settings.theme === 'string' && Object.prototype.hasOwnProperty.call(THEMES, settings.theme)) setTheme(settings.theme);
        if (typeof settings.muted === 'boolean') setMuted(settings.muted);
        setPower(clamp(settings.power, 0.75, 1.25, 1)); setBounce(clamp(settings.bounce, 0, 1, 0.5));
      }
    } catch { /* Invalid or blocked storage must not prevent a game. */ }
    setHighScoreState(best); setHighScore(best); hydrated.current = true;
  }, [getHighScore, setHighScore]);
  useEffect(() => {
    if (state.score > highScore) { setHighScoreState(state.score); setHighScore(state.score); }
  }, [state.score, highScore, setHighScore]);
  useEffect(() => {
    if (!hydrated.current) return;
    try { localStorage.setItem('pinball-settings-v2', JSON.stringify({ theme, muted, power, bounce })); } catch { /* Optional persistence. */ }
  }, [theme, muted, power, bounce]);

  useEffect(() => {
    if (!canvasRef.current) return;
    let alive = true;
    const audio = createPinballAudio(); audioRef.current = audio;
    try {
      const world = createPinballWorld(canvasRef.current, {
        onScore: () => undefined,
        onState: (next) => { if (alive) { stateRef.current = next; setState(next); } },
        onSound: (kind) => audio.play(kind),
      }, THEMES.space, 0.5);
      worldRef.current = world; setReady(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The pinball table could not start.');
    }
    return () => {
      alive = false; activeRef.current = false; clearControls(false);
      worldRef.current?.destroy(); worldRef.current = null;
      audio.destroy(); audioRef.current = null;
    };
  }, [clearControls]);
  useEffect(() => { worldRef.current?.setTheme(THEMES[theme] || THEMES.space); }, [theme]);
  useEffect(() => { worldRef.current?.setFlipperPower(power); }, [power]);
  useEffect(() => { worldRef.current?.setBounce(bounce); }, [bounce]);
  useEffect(() => { audioRef.current?.setMuted(muted); }, [muted]);
  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { setReducedMotion(media.matches); worldRef.current?.setReducedMotion(media.matches); };
    update(); media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const resize = () => {
      const { width, height } = stage.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      const scale = Math.min(width / constants.WIDTH, height / constants.HEIGHT, 1.5);
      setSize({ width: Math.floor(constants.WIDTH * scale), height: Math.floor(constants.HEIGHT * scale) });
      worldRef.current?.draw();
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(stage); window.addEventListener('resize', resize); resize();
    return () => { observer?.disconnect(); window.removeEventListener('resize', resize); };
  }, []);
  useEffect(() => { if (!isFocused) pause(); }, [isFocused, pause]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) pause(); };
    window.addEventListener('blur', pause); document.addEventListener('visibilitychange', hidden);
    hidden();
    return () => { window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', hidden); };
  }, [pause]);
  useEffect(() => { if (state.tilted || state.phase === 'over') clearControls(); }, [state.tilted, state.phase, clearControls]);

  useEffect(() => {
    const allowed = (event: KeyboardEvent) => {
      if (!shouldHandleGameKey(event, { isFocused: focusRef.current }) || document.hidden || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return false;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return false;
      if ((event.code === 'Space' || event.code === 'Enter') && target?.closest('button, a, summary')) return false;
      return true;
    };
    const down = (event: KeyboardEvent) => {
      if (!allowed(event)) return;
      const side = keySide(event.code);
      if (side && activeRef.current) { consumeGameKey(event); applyFlipper(side, `key:${event.code}`, true); }
      else if (event.code === 'Space' && activeRef.current) { consumeGameKey(event); if (!event.repeat) startCharge('keyboard'); }
      else if ((event.code === 'KeyN' || event.code === 'ArrowUp') && activeRef.current) { consumeGameKey(event); if (!event.repeat) nudge(); }
      else if ((event.code === 'KeyP' || event.code === 'Escape') && !event.repeat && !dialog) {
        consumeGameKey(event); if (paused) resume(); else pause();
      }
    };
    const up = (event: KeyboardEvent) => {
      // Release owned inputs even when focus has moved into an input or another app.
      const side = keySide(event.code);
      if (side) applyFlipper(side, `key:${event.code}`, false);
      if (event.code === 'Space' || event.code === 'Enter') {
        applyFlipper('left', `button:${event.code}`, false); applyFlipper('right', `button:${event.code}`, false);
      }
      if (event.code === 'Space' && chargeRef.current?.source === 'keyboard') {
        consumeGameKey(event); finishCharge('keyboard');
      }
    };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [applyFlipper, dialog, finishCharge, nudge, pause, paused, resume, startCharge]);

  useEffect(() => {
    if (!canRun) return;
    let frame = 0;
    let last: number | null = null;
    const animate = (now: number) => {
      if (!activeRef.current) return;
      let gamepad: Gamepad | null = null;
      try { gamepad = Array.from(navigator.getGamepads?.() || []).find((pad) => pad?.connected) || null; } catch { /* Gamepads are optional. */ }
      const left = Boolean(gamepad?.buttons[4]?.pressed || gamepad?.buttons[14]?.pressed || (gamepad?.axes[0] ?? 0) < -0.65);
      const right = Boolean(gamepad?.buttons[5]?.pressed || gamepad?.buttons[15]?.pressed || (gamepad?.axes[0] ?? 0) > 0.65);
      const shoot = Boolean(gamepad?.buttons[0]?.pressed);
      const shake = Boolean(gamepad?.buttons[3]?.pressed);
      const previous = gamepadRef.current;
      if (!left && !right && !shoot && !shake) previous.armed = true;
      if (previous.armed) {
        applyFlipper('left', 'gamepad', left); applyFlipper('right', 'gamepad', right);
        if (shoot && !previous.launch) startCharge('gamepad');
        if (!shoot && previous.launch) finishCharge('gamepad');
        if (shake && !previous.nudge) nudge();
      }
      previous.launch = shoot; previous.nudge = shake;
      if (chargeRef.current) setCharge(clamp((now - chargeRef.current.start) / 1050, 0.01, 1));
      worldRef.current?.step(last === null ? 0 : (now - last) / 1000);
      last = now; frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [canRun, applyFlipper, finishCharge, nudge, startCharge]);

  const controlDisabled = !canRun || state.tilted;
  const flipperButton = (side: Side) => <button type="button" className={styles.flipperButton}
    aria-label={`${side === 'left' ? 'Left' : 'Right'} flipper`} aria-pressed={pressed[side]} disabled={controlDisabled}
    onPointerDown={(event) => {
      if (event.button !== 0) return;
      event.preventDefault(); event.currentTarget.focus({ preventScroll: true });
      event.currentTarget.setPointerCapture?.(event.pointerId);
      applyFlipper(side, `pointer:${event.pointerId}`, true);
    }}
    onPointerUp={(event) => applyFlipper(side, `pointer:${event.pointerId}`, false)}
    onPointerCancel={(event) => applyFlipper(side, `pointer:${event.pointerId}`, false)}
    onLostPointerCapture={(event) => applyFlipper(side, `pointer:${event.pointerId}`, false)}
    onKeyDown={(event) => {
      if (!['Space', 'Enter'].includes(event.code)) return;
      event.preventDefault(); event.stopPropagation(); applyFlipper(side, `button:${event.code}`, true);
    }}
    onKeyUp={(event) => {
      if (!['Space', 'Enter'].includes(event.code)) return;
      event.preventDefault(); event.stopPropagation(); applyFlipper(side, `button:${event.code}`, false);
    }}
    onClick={(event) => {
      if (event.detail !== 0) return;
      applyFlipper(side, 'accessible-click', true);
      const timer = setTimeout(() => { applyFlipper(side, 'accessible-click', false); pulseTimers.current.delete(timer); }, 110);
      pulseTimers.current.add(timer);
    }}>
    <span>{side === 'left' ? '◀ FLIP' : 'FLIP ▶'}</span><small>{side === 'left' ? 'A / ←' : 'D / →'}</small>
  </button>;

  return <div ref={rootRef} className={styles.root} data-testid="pinball-app" data-phase={state.phase}
    data-game-active={canRun ? 'true' : 'false'} data-left-active={pressed.left} data-right-active={pressed.right}
    data-reduced-motion={reducedMotion}>
    <header className={styles.header}>
      <div className={styles.brand}><span className={styles.brandMark}>N</span><div><strong>NEON CIRCUIT</strong><small>PINBALL / ARCADE SYSTEM 01</small></div></div>
      <div className={styles.toolbar}>
        <button type="button" onClick={paused ? resume : pause} disabled={!ready || !isFocused || state.phase === 'over'} aria-label={paused ? 'Resume game' : 'Pause game'}>{paused ? '▶' : 'Ⅱ'}</button>
        <button type="button" onClick={() => { setMuted((value) => !value); if (muted) { audioRef.current?.setMuted(false); audioRef.current?.unlock(); } }} aria-label={muted ? 'Unmute sound' : 'Mute sound'} aria-pressed={muted}>{muted ? '♪̸' : '♪'}</button>
        <button type="button" onClick={() => openDialog('settings')} aria-label="Table settings">⚙</button>
        <button type="button" onClick={() => openDialog('help')} aria-label="How to play">?</button>
        <button type="button" onClick={() => state.phase === 'playing' || state.score > 0 ? openDialog('reset') : reset()} className={styles.newButton}>New game</button>
      </div>
    </header>
    <div className={styles.scoreboard}>
      <div><small>SCORE</small><output aria-label="Score" aria-live="off" className={styles.score}>{scoreText(state.score)}</output></div>
      <div><small>PERSONAL BEST</small><span className={styles.best}>HI {scoreText(highScore)}</span></div>
      <div className={styles.ballCounter}><small>{state.activeBalls > 1 ? 'MULTIBALL' : 'BALL STOCK'}</small><span>Balls: {state.ballsRemaining}</span><i aria-hidden="true">{[0, 1, 2].map((ball) => <b key={ball} data-lit={ball < state.ballsRemaining} />)}</i></div>
    </div>
    <div className={styles.body}>
      <div ref={stageRef} className={styles.stage}>
        <div className={styles.tableFrame} style={{ width: size.width, height: size.height }}>
          <canvas ref={canvasRef} width={constants.WIDTH} height={constants.HEIGHT} aria-label="Pinball playfield" role="img">
            Pinball table. Use the left and right flipper buttons or A and D. Hold and release Space to launch.
          </canvas>
        </div>
        {(!ready || error) && <div className={styles.boardOverlay}><h2>{error ? 'Table unavailable' : 'Preparing table…'}</h2><p>{error || 'Loading the playfield'}</p></div>}
        {paused && state.phase !== 'over' && !dialog && !error && <div className={styles.boardOverlay}><small>SIMULATION PAUSED</small><h2>Paused.</h2><p>{isFocused ? 'Your ball is right where you left it.' : 'Focus this window to continue.'}</p><button type="button" disabled={!isFocused} onClick={resume}>Continue</button></div>}
        {state.phase === 'over' && !dialog && <div className={styles.boardOverlay}><small>RUN COMPLETE</small><h2>Game over</h2><p>{scoreText(state.score)} points</p><button type="button" onClick={reset}>Play again</button></div>}
      </div>
      <aside className={styles.side} aria-label="Table objectives">
        <div className={styles.card}><small>THE CIRCUIT</small><h2>Light it up.</h2><p>Hit all three targets. Then hit the upper bumper for a jackpot and multiball.</p>
          <div className={styles.targetLights} aria-label={`${[0, 1, 2].filter((i) => state.targetMask & (1 << i)).length} of 3 targets lit`}>{[0, 1, 2].map((i) => <span key={i} data-lit={Boolean(state.targetMask & (1 << i))}>{i + 1}</span>)}</div>
          <strong className={styles.jackpot} data-lit={state.jackpotLit}>{state.jackpotLit ? 'JACKPOT READY' : 'JACKPOT · 5,000'}</strong>
        </div>
        <div className={styles.card}><small>BONUS ENGINE</small><div className={styles.bonus}><strong>{state.multiplier}×</strong><span>multiplier<br /><b>{state.combo}× combo</b></span></div><p>Light N · E · O for a multiplier. Chain different shots within two seconds.</p></div>
        <div className={styles.card}><small>TABLE HEALTH</small><strong className={styles.health}>{state.tilted ? 'TILT' : state.ballSave > 0 ? `SAVE · ${Math.ceil(state.ballSave)}s` : 'CIRCUIT ONLINE'}</strong><p>Three nudges in three seconds cause tilt. Keep it gentle.</p></div>
        <div className={styles.keyHint}><kbd>A</kbd><kbd>D</kbd> flippers <span><kbd>SPACE</kbd> launch</span><span><kbd>N</kbd> nudge · <kbd>P</kbd> pause</span></div>
      </aside>
    </div>
    <div className={styles.status} data-testid="pinball-status-banner" role="status" aria-live="polite" aria-atomic="true"><span aria-hidden="true" data-warning={state.tilted || state.warnings > 0} />{state.message}</div>
    <div className={styles.controls} role="group" aria-label="Pinball controls">
      {flipperButton('left')}
      <div className={styles.centerControls}>
        <button type="button" className={styles.nudgeButton} disabled={controlDisabled || state.phase !== 'playing'} onClick={nudge} aria-label="Nudge table">↑<small>NUDGE</small></button>
        <button type="button" className={styles.launchButton} disabled={controlDisabled || state.phase !== 'ready'} aria-label="Launch ball"
          onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.setPointerCapture?.(event.pointerId); startCharge(`pointer:${event.pointerId}`); }}
          onPointerUp={(event) => finishCharge(`pointer:${event.pointerId}`)}
          onPointerCancel={(event) => { if (chargeRef.current?.source === `pointer:${event.pointerId}`) cancelCharge(); }}
          onLostPointerCapture={(event) => { if (chargeRef.current?.source === `pointer:${event.pointerId}`) cancelCharge(); }}
          onClick={(event) => { if (event.detail === 0) launch(); }}>
          <span>{charge > 0 ? 'RELEASE' : 'LAUNCH'}</span><small>{charge > 0 ? `${Math.round(charge * 100)}%` : 'HOLD TO CHARGE'}</small>
          <progress aria-label="Launch charge" max={1} value={charge} />
        </button>
      </div>
      {flipperButton('right')}
    </div>
    {dialog && <GameDialog title={dialog === 'help' ? 'How to play' : dialog === 'settings' ? 'Table settings' : 'Start a new game?'} onClose={() => setDialog(null)}>
      {dialog === 'help' ? <div className={styles.help}>
        <p><strong>Launch.</strong> Tap Launch for a standard shot, or hold and release Launch / Space to charge the plunger.</p>
        <p><strong>Flip.</strong> Hold A / ← for the left flipper and D / → for the right. Touch supports both flippers at once.</p>
        <p><strong>Build a run.</strong> Hit targets 1–2–3, then the upper bumper, for a 5,000-point jackpot and three-ball multiball. Light all N–E–O lanes to increase the multiplier, up to 5×. Different shots within two seconds chain up to a 4× combo.</p>
        <p><strong>Save & tilt.</strong> Each new ball has one seven-second save. N / ↑ nudges; three nudges in three seconds disable flippers and scoring until the next ball. P / Esc pauses. Focus loss always pauses; resuming is explicit.</p>
        <p><strong>Gamepad.</strong> LB / RB or left stick: flippers. Hold A to charge, release to launch. Y: nudge.</p>
        <button type="button" onClick={() => setDialog(null)}>Back to table</button>
      </div> : dialog === 'settings' ? <div className={styles.settings}>
        <label>Cabinet theme<select aria-label="Cabinet theme" value={theme} onChange={(event) => setTheme(event.target.value)}><option value="space">Neon circuit</option><option value="classic">Midnight classic</option><option value="forest">Emerald circuit</option></select></label>
        <label>Flipper strength · {power.toFixed(2)}×<input aria-label="Flipper strength" type="range" min="0.75" max="1.25" step="0.05" value={power} onChange={(event) => setPower(Number(event.target.value))} /></label>
        <label>Flipper elasticity · {bounce.toFixed(1)}<input aria-label="Table elasticity" type="range" min="0" max="1" step="0.1" value={bounce} onChange={(event) => setBounce(Number(event.target.value))} /></label>
        <p>{reducedMotion ? 'Reduced motion is on: trails, particles and flashes are disabled.' : 'Reduced-motion preferences are respected automatically.'} Sound and settings stay on this device.</p>
        <button type="button" onClick={() => setDialog(null)}>Done</button>
      </div> : <div className={styles.help}><p>Your current run will end. Your personal best will be kept.</p><div className={styles.dialogActions}><button type="button" onClick={() => setDialog(null)}>Keep playing</button><button type="button" onClick={reset}>Start new game</button></div></div>}
    </GameDialog>}
  </div>;
}
