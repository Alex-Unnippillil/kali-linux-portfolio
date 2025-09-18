import type { Tower } from '.';

export type TowerDefenseTowerStats = {
  id: string;
  x: number;
  y: number;
  damage: number;
};

export type TowerDefenseWaveStats = {
  wave: number;
  spawned: number;
  kills: number;
  leaks: number;
  earned: number;
  spent: number;
};

export type TowerDefenseEconomyStats = {
  startingBalance: number;
  earned: number;
  spent: number;
  balance: number;
};

export type TowerDefenseTelemetrySnapshot = {
  waves: TowerDefenseWaveStats[];
  towers: TowerDefenseTowerStats[];
  economy: TowerDefenseEconomyStats;
};

type TowerPosition = Pick<Tower, 'x' | 'y'>;

type TelemetryMaps = {
  waves: Map<number, TowerDefenseWaveStats>;
  towers: Map<string, TowerDefenseTowerStats>;
};

const towerKey = (tower: TowerPosition) => `${tower.x},${tower.y}`;

const cloneWave = (wave: TowerDefenseWaveStats): TowerDefenseWaveStats => ({
  wave: wave.wave,
  spawned: wave.spawned,
  kills: wave.kills,
  leaks: wave.leaks,
  earned: wave.earned,
  spent: wave.spent,
});

const cloneTower = (tower: TowerDefenseTowerStats): TowerDefenseTowerStats => ({
  id: tower.id,
  x: tower.x,
  y: tower.y,
  damage: tower.damage,
});

export const createTelemetry = (startingBalance = 0) => {
  const maps: TelemetryMaps = {
    waves: new Map(),
    towers: new Map(),
  };
  const initialBalance = startingBalance;
  let earnedTotal = 0;
  let spentTotal = 0;

  const ensureWave = (wave: number) => {
    let entry = maps.waves.get(wave);
    if (!entry) {
      entry = {
        wave,
        spawned: 0,
        kills: 0,
        leaks: 0,
        earned: 0,
        spent: 0,
      };
      maps.waves.set(wave, entry);
    }
    return entry;
  };

  const ensureTower = (tower: TowerPosition) => {
    const key = towerKey(tower);
    let entry = maps.towers.get(key);
    if (!entry) {
      entry = {
        id: key,
        x: tower.x,
        y: tower.y,
        damage: 0,
      };
      maps.towers.set(key, entry);
    }
    return entry;
  };

  const reset = () => {
    maps.waves.clear();
    maps.towers.clear();
    earnedTotal = 0;
    spentTotal = 0;
  };

  const recordEarn = (amount: number, wave?: number) => {
    if (amount <= 0) return;
    earnedTotal += amount;
    if (typeof wave === 'number') {
      ensureWave(wave).earned += amount;
    }
  };

  return {
    registerTower: (tower: TowerPosition) => {
      ensureTower(tower);
    },
    setWaveSpawnCount: (wave: number, count: number) => {
      const entry = ensureWave(wave);
      entry.spawned = count;
    },
    recordTowerDamage: (tower: TowerPosition, amount: number) => {
      if (amount <= 0) return;
      const entry = ensureTower(tower);
      entry.damage += amount;
    },
    recordLeak: (wave: number) => {
      ensureWave(wave).leaks += 1;
    },
    recordKill: (wave: number, reward = 0) => {
      const entry = ensureWave(wave);
      entry.kills += 1;
      recordEarn(reward, wave);
    },
    recordEarn,
    recordSpend: (amount: number, wave?: number) => {
      if (amount <= 0) return;
      spentTotal += amount;
      if (typeof wave === 'number') {
        ensureWave(wave).spent += amount;
      }
    },
    reset,
    getSnapshot: (): TowerDefenseTelemetrySnapshot => {
      const waves = Array.from(maps.waves.values())
        .map(cloneWave)
        .sort((a, b) => a.wave - b.wave);
      const towers = Array.from(maps.towers.values())
        .map(cloneTower)
        .sort((a, b) => a.id.localeCompare(b.id));
      return {
        waves,
        towers,
        economy: {
          startingBalance: initialBalance,
          earned: earnedTotal,
          spent: spentTotal,
          balance: initialBalance + earnedTotal - spentTotal,
        },
      };
    },
  };
};

export const telemetryToCsv = (snapshot: TowerDefenseTelemetrySnapshot) => {
  const lines: string[] = [];
  lines.push('Wave Stats');
  lines.push('wave,spawned,kills,leaks,earned,spent');
  snapshot.waves.forEach((wave) => {
    lines.push(
      [
        wave.wave,
        wave.spawned,
        wave.kills,
        wave.leaks,
        wave.earned,
        wave.spent,
      ].join(','),
    );
  });
  lines.push('');
  lines.push('Tower Damage');
  lines.push('tower,x,y,damage');
  snapshot.towers.forEach((tower) => {
    lines.push([tower.id, tower.x, tower.y, tower.damage].join(','));
  });
  lines.push('');
  lines.push('Economy');
  lines.push('metric,value');
  lines.push(`startingBalance,${snapshot.economy.startingBalance}`);
  lines.push(`earned,${snapshot.economy.earned}`);
  lines.push(`spent,${snapshot.economy.spent}`);
  lines.push(`balance,${snapshot.economy.balance}`);
  return lines.join('\n');
};

export type TowerDefenseTelemetry = ReturnType<typeof createTelemetry>;
