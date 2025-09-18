# Motion Inventory

This document captures where the shared motion tokens are applied and which interactions still operate outside the 120–180 ms target range. All timing references are pulled from `styles/tokens.css`.

## Standardized transitions

| Location | Interaction | Token(s) | Notes |
| --- | --- | --- | --- |
| `styles/tailwind.css` | Global hover/active helpers | `--motion-medium`, `--motion-fast` | Custom utilities keep shared hover/active treatments within range. |
| `components/screen/lock_screen.js` | Lock curtain slide & wallpaper blur | `--motion-slow` | Slide-in now uses `transition-transform` with the slow token for parity across effects. |
| `components/screen/navbar.js` & `components/menu/WhiskerMenu.tsx` | Focus/hover state underline | `--motion-fast` | Primary navigation focus rings share the same fast ramp. |
| `components/base/ubuntu_app.js` | Launch bounce timeout | `--motion-medium` | JavaScript timeout reads the CSS variable before resetting state. |
| `components/ToggleSwitch.tsx` & `pages/ui/settings/theme.tsx` | Toggle track/knob | `--motion-medium` | Both shared and settings toggles animate with matching timing. |
| `components/ui/Toast.tsx` | Toast slide-in/out | `--motion-medium` | Keeps feedback motion subtle but noticeable. |
| `components/ui/ProgressBar.tsx` | Progress fill updates | `--motion-medium` | Prevents the fill bar from lagging while remaining smooth. |
| `components/apps/contact/index.tsx` | Floating labels | `--motion-medium` | Labels glide into place consistently across inputs. |

## Documented exceptions

The following transitions remain longer than 180 ms for usability reasons, but continue to respect reduced-motion fallbacks:

- `styles/index.css` & card games – Blackjack (`0.3s–0.6s`) and Solitaire (`0.3s–1s`) keep longer flips and cascades so players can track card order changes.
- `components/apps/alex.js` – Timeline reveal (`duration-700`) staggers entries for narrative pacing; shortening caused crowded animation in manual checks.
- `components/apps/todoist.js` – Accordion panels (`duration-300`) need extra time to avoid content jump when large lists expand.
- `games/wordle/index.tsx` – Row reveal delay (`transitionDelay: col * 300`) mirrors original game timing to preserve recognition of letter evaluation.

When these flows are revisited, consider bespoke easing or staged animations that keep per-step motion within the shared token window.
