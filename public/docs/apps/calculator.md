# Calculator Help

## Modes
- **Basic**: arithmetic (+ - * /), parentheses, percent (`n%` means `n / 100`).
- **Scientific**: adds trig (`sin` etc), logs, roots, constants (`pi`, `e`), factorial `!`, and angle unit toggle.
- **Programmer**: integer-only BigInt math with base select (BIN/OCT/DEC/HEX), operators `& | ^ ~ << >>`.

## Keyboard shortcuts
- `Enter` / `=` evaluate
- `Backspace` delete last token
- `Esc` clear
- `Ctrl+Z` undo, `Ctrl+Shift+Z` redo

## Expression grammar
- Binary operators: `+ - * / ^` (programmer mode uses `^` as XOR).
- Unary operators: `-`, `+`, `~` (programmer only).
- Postfix operators: `!` and `%`.
- Functions: `sin, cos, tan, asin, acos, atan, sqrt, cbrt, abs, ln, log10, exp, pow(a,b), floor, ceil, round, mod(a,b)`.
- Constants: `pi`, `e`, `ans`.

## Programmer mode rules
- Integers only. Decimal literals are rejected.
- Digits must match selected base.
- `~` uses a 64-bit mask for two's-complement style output.
- Shift count must be between `0` and `256`.

## Examples
- Basic: `(2+3)*4` -> `20`
- Scientific: `sin(90)` in Degrees -> `1`
- Scientific: `mod(10,3)` -> `1`
- Programmer (HEX): `A & 3` -> `2`
- Programmer (BIN): `1 << 4` -> `10000`
