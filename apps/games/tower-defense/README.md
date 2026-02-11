# Tower Defense App

## Controls

- **Start**: begin from intro overlay.
- **Left click on map**: place currently selected tower or select an existing tower.
- **Build menu**: choose Basic / Rapid / Sniper / Splash towers.
- **Selected tower panel**: upgrade, cycle targeting mode (`first` / `strongest`), or sell.
- **Wave controls**: send next wave, toggle auto-start, switch 1x/2x speed.

## Towers and upgrades

- **Basic**: balanced single-target tower.
- **Rapid**: low damage, high fire rate.
- **Sniper**: high damage, long range, slower cadence.
- **Splash**: AoE damage on impact in a small radius.

Each tower supports upgrades to level 3. Upgrades increase damage/range/fire rate according to per-tower scaling values in `index.ts`. Sell refunds 70% of invested cost.

## Enemy types

- **Normal**: balanced baseline.
- **Fast**: lower HP, faster speed.
- **Tank**: high HP, slower speed.

Enemy HP and reward scale by wave index while preserving each archetype’s speed profile.

## Wave system

- Waves are configured data-first in `engine.ts` (`DEFAULT_WAVES`).
- Each wave contains enemy composition, spawn interval, and completion bonus.
- During `between-waves`, player can build before sending the next wave.
- Win condition: clear all waves. Lose condition: lives reach zero.

## File layout

- `index.ts`: tower/enemy definitions and stat helpers.
- `engine.ts`: simulation state, dispatch actions, spawning/movement/combat/economy.
- `renderer.ts`: deterministic canvas rendering layers.
- `components/DpsCharts.tsx`: UI chart for aggregate DPS by tower type.
- `components/RangeUpgradeTree.tsx`: visual upgrade range rings for selected tower.

## Extension points

- **Add a tower**: define it in `TOWER_TYPES` + include key in `TowerTypeKey`.
- **Add enemy type**: define it in `ENEMY_TYPES` + include key in `EnemyTypeKey`.
- **Add map/path**: pass `pathCells` through `createTowerDefenseEngine` config.
- **Add waves**: pass `waves` through `createTowerDefenseEngine` config.

## Performance notes

- Simulation runs in a requestAnimationFrame loop with clamped `dt` (`<= 0.05`) to avoid tab-switch spikes.
- Canvas draw is isolated from React reconciliation.
- Engine mutates internal state and returns cheap snapshots for UI.
- Projectile and enemy updates avoid per-frame React state churn.
