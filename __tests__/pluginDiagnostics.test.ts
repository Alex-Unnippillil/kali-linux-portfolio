import { detectPeerDependencyIssues, formatInstallCommands } from '../apps/plugin-manager/components/Diagnostics';
import type { PluginMetadata } from '../apps/plugin-manager/components/Diagnostics';

describe('plugin peer dependency diagnostics', () => {
  test('identifies missing and incompatible peer dependencies', () => {
    const manifests: PluginMetadata[] = [
      {
        id: 'renderer',
        name: 'Renderer',
        peerDependencies: {
          react: '^19.0.0',
          'react-dom': '^19.0.0',
        },
      },
      {
        id: 'legacy-ui',
        peerDependencies: {
          lodash: '^5.0.0',
          react: '^18.0.0',
        },
      },
    ];

    const hostPackages = {
      react: '^19.1.0',
      'react-dom': '19.1.1',
      lodash: '^4.17.0',
    };

    const issues = detectPeerDependencyIssues(manifests, hostPackages);

    expect(issues).toEqual([
      {
        pluginId: 'legacy-ui',
        pluginName: 'legacy-ui',
        dependency: 'lodash',
        requiredRange: '^5.0.0',
        installedVersion: '^4.17.0',
      },
      {
        pluginId: 'legacy-ui',
        pluginName: 'legacy-ui',
        dependency: 'react',
        requiredRange: '^18.0.0',
        installedVersion: '^19.1.0',
      },
    ]);
  });

  test('produces yarn and npm commands with quoted ranges when needed', () => {
    const commands = formatInstallCommands('react', '^18.0.0 || ^19.0.0');

    expect(commands).toEqual({
      yarn: 'yarn add react@"^18.0.0 || ^19.0.0"',
      npm: 'npm install react@"^18.0.0 || ^19.0.0"',
    });
  });

  test('omits the version suffix when a plugin omits the range', () => {
    const commands = formatInstallCommands('left-pad', '');

    expect(commands).toEqual({
      yarn: 'yarn add left-pad',
      npm: 'npm install left-pad',
    });
  });
});
