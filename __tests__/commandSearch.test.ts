import { performance } from 'perf_hooks';
import {
  CommandRuntimeContext,
  fuzzySearchCommands,
  prepareCommands,
  resolveCommands,
} from '../data/commands';

describe('command registry search', () => {
  const context: CommandRuntimeContext = {
    settings: {
      accent: '#1793d1',
      wallpaper: 'wall-1',
      density: 'regular',
      reducedMotion: false,
      fontScale: 1,
      highContrast: false,
      largeHitAreas: false,
      pongSpin: true,
      allowNetwork: true,
      haptics: true,
      theme: 'default',
    },
  };

  it('resolves application and settings commands with subtitles', () => {
    const resolved = resolveCommands(context);
    const terminalCommand = resolved.find((command) => command.id === 'open-app-terminal');
    expect(terminalCommand).toBeDefined();
    const highContrast = resolved.find((command) => command.id === 'toggle-high-contrast');
    expect(highContrast?.subtitle).toBe('Disabled');
    const darkTheme = resolved.find((command) => command.id === 'set-theme-dark');
    expect(darkTheme?.subtitle).toBe('Switch to Dark theme');
    const defaultAccent = resolved.find((command) => command.id === 'set-accent-1793d1');
    expect(defaultAccent?.subtitle).toBe('Current accent color');
  });

  it('matches commands using fuzzy search', () => {
    const prepared = prepareCommands(resolveCommands(context));
    const matches = fuzzySearchCommands('tm', prepared);
    const terminal = matches.find(
      (command) => command.action.type === 'open-app' && command.action.appId === 'terminal',
    );
    expect(terminal).toBeDefined();
    const network = fuzzySearchCommands('toggle net', prepared).find(
      (command) => command.id === 'toggle-allow-network',
    );
    expect(network).toBeDefined();
  });

  it('completes fuzzy searches in under 100ms', () => {
    const prepared = prepareCommands(resolveCommands(context));
    const queries = ['app', 'set theme', 'toggle', 'accent'];
    const iterations = 50;
    const start = performance.now();
    for (let i = 0; i < iterations; i += 1) {
      for (const query of queries) {
        fuzzySearchCommands(query, prepared);
      }
    }
    const duration = performance.now() - start;
    const average = duration / (iterations * queries.length);
    expect(duration).toBeLessThan(100);
    expect(average).toBeLessThan(0.5);
  });
});

