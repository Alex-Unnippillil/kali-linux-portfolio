jest.mock('idb-keyval');

import httpEnvironmentStore, {
  __dangerous__resetHttpEnvironmentStoreForTests,
  extractPlaceholders,
  HttpEnvironment,
  resolveTemplate,
} from '../../../apps/http/state/environments';

const idb = require('idb-keyval') as { __resetStore?: () => void };

beforeEach(async () => {
  idb.__resetStore?.();
  await __dangerous__resetHttpEnvironmentStoreForTests();
  await httpEnvironmentStore.ready();
});

describe('template parsing', () => {
  test('replaces placeholders while leaving unknown tokens intact', () => {
    const environment: HttpEnvironment = {
      id: 'env-test',
      name: 'Test',
      variables: {
        token: 'abc123',
        version: 'v2',
        'dashed-name': 'dash',
      },
    };

    const template =
      'https://api.example.com/{{ version }}/users/{{token}}?missing={{ missing }}&dash={{dashed-name}}';

    expect(resolveTemplate(template, environment)).toBe(
      'https://api.example.com/v2/users/abc123?missing={{ missing }}&dash=dash',
    );
  });

  test('ignores malformed placeholders and de-duplicates extracted names', () => {
    const environment: HttpEnvironment = {
      id: 'env-mixed',
      name: 'Mixed',
      variables: { token: 'value' },
    };
    const template =
      'start {{ }} repeat {{ token }} + {{token}} literal {{{token}}} tail {{token';

    expect(resolveTemplate(template, environment)).toBe(
      'start {{ }} repeat value + value literal {{{token}}} tail {{token',
    );

    expect(extractPlaceholders(template)).toEqual(['token']);
  });
});

describe('environment switching', () => {
  test('notifies subscribers with updated substitutions when active environment changes', async () => {
    const defaultEnv = httpEnvironmentStore.getActiveEnvironment();
    if (defaultEnv) {
      await httpEnvironmentStore.setEnvironmentVariable(defaultEnv.id, 'token', 'default');
    }

    const staging = await httpEnvironmentStore.createEnvironment('Staging');
    await httpEnvironmentStore.setEnvironmentVariable(staging.id, 'token', 'staging-token');

    const production = await httpEnvironmentStore.createEnvironment('Production');
    await httpEnvironmentStore.setEnvironmentVariable(production.id, 'token', 'prod-token');

    const observed: string[] = [];
    const template = 'Authorization: Bearer {{token}}';

    const unsubscribe = httpEnvironmentStore.subscribe((snapshot) => {
      const active =
        snapshot.environments.find((env) => env.id === snapshot.activeEnvironmentId) ??
        snapshot.environments[0];
      observed.push(resolveTemplate(template, active ?? null));
    });

    await httpEnvironmentStore.setActiveEnvironment(staging.id);
    await httpEnvironmentStore.setActiveEnvironment(production.id);

    unsubscribe();

    expect(observed).toEqual([
      'Authorization: Bearer staging-token',
      'Authorization: Bearer prod-token',
    ]);
  });
});
