# Candy Crush (match-3)

A deterministic match-3 implementation for the desktop-style app shell.

## Engine overview

- Engine modules are pure TypeScript in `engine/*`.
- Turn resolver pipeline: swap -> combo check -> match detect -> create specials -> remove -> gravity -> refill -> repeat until stable.
- `resolveTurn` also handles no-legal-move reshuffle and emits a debug queue for inspection.

## Specials and combos

- Match 4 in a row/column: creates striped (`stripedH` / `stripedV`).
- Match 5 in L/T: creates wrapped (3x3 blast).
- Match 5 in line: creates color bomb.
- Combos:
  - striped + striped => row + column cross clear.
  - wrapped + wrapped => 5x5 clear.
  - colorBomb + colorBomb => clear board.
  - colorBomb + normal => clear that color.
  - colorBomb + striped/wrapped => convert that color into chosen special and trigger.

## Level format

Levels are in `levels/levels.ts` and validated by zod.

```ts
{
  id: number;
  name: string;
  rows: number;
  cols: number;
  moves: number;
  colors: Color[];
  spawnWeights?: Partial<Record<Color, number>>;
  objectives: Objective[];
  blockers?: { jelly?: Coord[]; doubleJelly?: Coord[]; ice?: Coord[]; doubleIce?: Coord[] };
  mask?: Coord[];
}
```

## Add a new level

1. Append a level object to `rawLevels` in `levels/levels.ts`.
2. Keep objectives' `progress` at `0`.
3. Run `yarn test __tests__/candyCrush.engine.test.ts`.

## Known limitations

- Animations are CSS-lite and intentionally simple for stability.
- Special chaining is deterministic but simplified compared to commercial Candy Crush.

## Integration notes

Repository integration patterns matched:

- App entry proxy pattern (`components/apps/battleship.js` imports feature app module).
- Complex game state + hooks (`components/apps/pacman.tsx`).
- Persistence with `usePersistentState` (`components/apps/2048.js`, `components/apps/pacman.tsx`).
- App registry dynamic import metadata in `apps.config.js` (`id: candy-crush` and dynamic import for `./components/apps/candy-crush`).

