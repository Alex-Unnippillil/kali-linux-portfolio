# Neon Circuit pinball

## Entry points and scope

The desktop registry resolves `components/apps/pinball.js`, which now re-exports
`apps/pinball`. The existing TypeScript shim and `/apps/pinball` route use the
same app. The standalone route provides a viewport-height container; desktop
windows retain their own layout/focus ownership. No registry, shared game
contract, dependencies, external network calls or deployment settings changed.

The old desktop sandbox/editor is superseded by the arcade table. Its
`pinball-layouts` and `pinball-table` values are not deleted. Finite legacy
`pinball-highscores` values migrate to the existing `highscore:pinball` key.
New validated preferences use `pinball-settings-v2`. Blocked/corrupt storage is
non-fatal; no score or settings leave the device.

## Play

- A / Left and D / Right hold the flippers. On-screen flippers support separate
  captured pointers, cancellation and keyboard activation. Gamepad LB/RB or the
  left stick operate the same controls.
- Tap Launch for a standard shot. Hold/release Launch or Space for variable
  power. Gamepad A charges and releases; Y nudges.
- Targets 1–2–3 light a jackpot. The upper bumper collects a 5,000 base-point
  bonus and starts three-ball multiball. Complete N–E–O lanes to increase the
  multiplier up to 5x; different major shots within two seconds chain up to 4x.
- Three lives per run. Each new ball has one seven-second saver, measured from
  launch in simulation time. A saved ball does not refresh it. Extra multiball
  drains do not consume stock; only the final active ball can cost a life.
- N / Up nudges. Three nudges in three seconds tilt for the remainder of that
  ball, disabling flippers, scoring and the saver. Repeated key events cannot
  bypass the nudge cooldown.
- P / Escape or the toolbar pauses. Blur, hidden tabs and unfocused/minimized
  windows release controls and pause. Resume is always explicit. Dialogs pause
  the game and retain keyboard focus. Restarting an active run is confirmed.

## Engineering

`rules.ts` is a renderer-independent deterministic state machine. Its cooldowns,
combos, target reset, saver and tilt use simulation time, not timers.
`table.ts` defines geometry shared by colliders and Canvas drawing.
`physics.ts` uses Matter 0.20 at 120 Hz with an accumulator, at most eight
catch-up steps and a 24-unit/60-Hz velocity cap. Pivot-based motorised flippers
transfer one bounded stroke impulse per ball; resting contacts can be struck.
The app owns one RAF, which polls optional gamepads, steps physics and paints.

`renderer.ts` caches static cabinet art, caps DPR at 2 and bounds trails and
particles. Reduced motion removes trails, particles, flashes and decorative
rotation, not the essential ball/flipper motion. Audio is gesture-created,
polyphony-limited and fully disposed. No image assets or remote fonts are used.

## Verification

Run with the repository's Node 24 / Yarn 4 environment:

```sh
yarn lint
yarn typecheck
yarn test --runInBand pinball
yarn test --coverage --maxWorkers=2
yarn build
yarn export
yarn playwright test --config=playwright.portfolio.config.ts pinball-app-polish
```

The `pinball-app-polish.spec.ts` suffix is deliberately included by the existing
Chromium, Firefox and WebKit project filters. It checks 320/390/1440px layouts,
real Canvas rendering and frozen pixels while paused, launch and simultaneous
keyboard controls, settings, restart, serious/critical accessibility violations
and the real desktop registry/minimize path. Screenshots are written to the
existing `portfolio-screenshots` artifact directory.

Jest covers rules, actual headless Matter trajectories/frame-rate independence,
pivot and stroke mechanics, bounded work/speed/body counts, scoring persistence,
atomic drains, multi-pointer/input ownership, focus loss and teardown.

Local dependency-free checks are not substitutes for the full CI/browser gates.
The local initial pass strict-compiled rules/table/renderer/audio, ran eleven
Node rule assertions and rendered a synthetic Canvas preview. Release evidence
belongs to the exact PR head's CI jobs and browser artifacts.
