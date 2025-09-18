import {
  createTelemetry,
  telemetryToCsv,
} from '../apps/games/tower-defense/telemetry';

describe('tower defense telemetry aggregation', () => {
  test('tracks wave leaks, kills, and tower damage', () => {
    const telemetry = createTelemetry(100);
    telemetry.registerTower({ x: 1, y: 2 });
    telemetry.setWaveSpawnCount(1, 3);
    telemetry.recordTowerDamage({ x: 1, y: 2 }, 4);
    telemetry.recordTowerDamage({ x: 1, y: 2 }, 6);
    telemetry.recordLeak(1);
    telemetry.recordKill(1, 5);

    const snapshot = telemetry.getSnapshot();
    expect(snapshot.waves).toEqual([
      {
        wave: 1,
        spawned: 3,
        kills: 1,
        leaks: 1,
        earned: 5,
        spent: 0,
      },
    ]);
    expect(snapshot.towers).toEqual([
      { id: '1,2', x: 1, y: 2, damage: 10 },
    ]);
    expect(snapshot.economy).toEqual({
      startingBalance: 100,
      earned: 5,
      spent: 0,
      balance: 105,
    });
  });

  test('records spending and exports csv matching snapshot', () => {
    const telemetry = createTelemetry(50);
    telemetry.setWaveSpawnCount(1, 0);
    telemetry.recordSpend(20);
    telemetry.registerTower({ x: 0, y: 0 });
    telemetry.recordTowerDamage({ x: 0, y: 0 }, 3);
    telemetry.recordKill(1, 5);

    const snapshot = telemetry.getSnapshot();
    const csv = telemetryToCsv(snapshot);

    expect(csv).toContain('Wave Stats');
    expect(csv).toContain('wave,spawned,kills,leaks,earned,spent');
    expect(csv).toContain('1,0,1,0,5,0');
    expect(csv).toContain('Tower Damage');
    expect(csv).toContain('0,0,0,3');
    expect(csv).toContain('Economy');
    expect(csv).toContain('startingBalance,50');
    expect(csv).toContain('earned,5');
    expect(csv).toContain('spent,20');
    expect(snapshot.economy.balance).toBe(35);
  });
});
