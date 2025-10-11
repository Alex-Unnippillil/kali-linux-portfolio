# Calculator button logic audit

This note captures the button-driven flows that power the legacy calculator implementation prior to the parser refactor.
It covers `components/apps/calculator.js` (dynamic wrapper) and every handler wired inside
`apps/calculator/index.tsx` and `apps/calculator/main.js`.

## Dynamic wrapper

`components/apps/calc.js` wraps the Next.js page in a dynamic import to keep the heavy bundle off
the main thread until the user opens the window. The wrapper is minimal: it pulls in
`../../apps/calculator` with `ssr: false` and surfaces it through the desktop registry. The legacy
`components/apps/calculator.js` wrapper follows the same pattern for older routes.

## DOM-driven event wiring in `apps/calculator/index.tsx`

`index.tsx` renders the entire keypad and utility controls. The component does not attach React
handlers directly to the buttons—instead it bootstraps a side-effect that loads `main.js` and then
walks the DOM to attach listeners.

Key details from that effect:

- Every element with the `.btn` class becomes clickable. The handler reads `data-action`,
  `data-value`, and `data-key` to decide what to do when the button fires.
- The helper `insertAtCursor(text)` inserts characters into the display input honouring the current
  selection. Any button without a `data-action` falls back to this behaviour.
- `data-action="clear"` wipes the display; `data-action="backspace"` removes the last character;
  `data-action="equals"` triggers evaluation and history recording.
- `data-action="ans"` recalls the last result; `mplus`, `mminus`, and `mr` call the respective
  memory helpers from `main.js`.
- Buttons expose keyboard shortcuts through `data-key`. A global `keydown` listener mirrors the
  button behaviour: Enter/`=` triggers equals, Backspace deletes, Escape/`c` clears, and any other
  character mapped in `data-key` dispatches a synthetic `.click()`.
- The history and formula drawers rely on manual `classList.toggle('hidden')` toggling bound to the
  “history” and “formulas” pill buttons.
- Programmer mode uses the `select#base-select` element. Its `change` event calls `setBase` from
  `main.js` so subsequent evaluations interpret literals in the selected base.

## Evaluation logic in `apps/calculator/main.js`

`main.js` owns the actual evaluation and side-channel state. The file exposes several pure-ish
helpers that the DOM layer imports:

- Mode toggles: `setPreciseMode`, `setProgrammerMode`, and `setBase` mutate module-level flags that
  downstream helpers consult.
- Conversion helpers: `convertBase` and `formatBase` translate numbers between bases when programmer
  mode is active.
- Tokenizer and parser: `tokenize`, `toRPN`, and `evalRPN` implement a shunting-yard pipeline on top
  of Math.js. Tokens capture numbers, identifiers, functions, units, and operators. Unary minus and
  parentheses are handled explicitly.
- `evaluate(expression, vars?)` drives the user-visible result. It optionally merges stored
  variables from `localStorage`, routes through the tokenizer and RPN evaluator, updates the
  `lastResult` tracker, and returns the formatted value. Programmer mode short-circuits to Math.js
  evaluation after converting every literal to decimal.
- Memory helpers (`memoryAdd`, `memorySubtract`, `memoryRecall`) reuse `evaluate()` to interpret the
  expression shown in the display before mutating the module-level `memory` register.
- `getLastResult()` feeds the Ans button and tape recall buttons.

In addition to the exported helpers, `main.js` also loads Math.js on demand (injecting a `<script>`
when the calculator boots) and reconfigures its precision whenever precise mode toggles.

## Takeaways for the refactor

- The click handlers rely purely on `data-action`/`data-value` attributes. Any refactor should keep
  those semantics so tests and keyboard bindings stay aligned.
- Memory, Ans, and history behaviours are implemented entirely in `main.js`; a new parser must
  preserve the public helper surface so the UI can keep calling into it.
- Programmer mode today depends on base conversion before Math.js evaluation. Replacing Math.js with
  a custom shunting-yard evaluator will need to support base-aware literals, bitwise operators, and
  modular arithmetic to maintain feature parity.
