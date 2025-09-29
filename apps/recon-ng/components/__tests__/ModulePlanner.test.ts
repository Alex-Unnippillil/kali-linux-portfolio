import { buildModuleGraph, ModuleStatus } from '../ModulePlanner';

type TestModuleDef = {
  deps: string[];
  tags: string[];
};

const createMetadata = (statuses: Record<string, ModuleStatus>) =>
  Object.fromEntries(
    Object.entries(statuses).map(([id, status]) => [id, { status }]),
  );

describe('buildModuleGraph', () => {
  const baseModules: Record<string, TestModuleDef> = {
    Alpha: { deps: [], tags: [] },
    Beta: { deps: ['Alpha'], tags: [] },
  };

  it('marks installed dependencies as OK links', () => {
    const metadata = createMetadata({ Alpha: 'installed', Beta: 'installed' });
    const graph = buildModuleGraph(baseModules, metadata, ['Beta']);

    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'Alpha',
          status: 'installed',
          isVirtual: false,
          isSelected: false,
        }),
        expect.objectContaining({
          id: 'Beta',
          status: 'installed',
          isVirtual: false,
          isSelected: true,
        }),
      ]),
    );

    expect(graph.links).toHaveLength(1);
    expect(graph.links[0]).toMatchObject({
      source: 'Alpha',
      target: 'Beta',
      status: 'ok',
    });
  });

  it('flags missing dependencies and blocks downstream links', () => {
    const metadata = createMetadata({ Alpha: 'missing', Beta: 'installed' });
    const graph = buildModuleGraph(baseModules, metadata, []);

    expect(graph.links[0]).toMatchObject({ status: 'blocked' });
    expect(
      graph.nodes.find((node) => node.id === 'Alpha'),
    ).toMatchObject({ status: 'missing' });
  });

  it('creates virtual nodes for undefined dependencies and keeps their status', () => {
    const modules: Record<string, TestModuleDef> = {
      Alpha: { deps: ['Gamma'], tags: [] },
      Beta: { deps: [], tags: [] },
    };
    const metadata = createMetadata({
      Alpha: 'installed',
      Beta: 'missing',
      Gamma: 'error',
    });

    const graph = buildModuleGraph(modules, metadata, ['Alpha']);

    const gamma = graph.nodes.find((node) => node.id === 'Gamma');
    expect(gamma).toMatchObject({
      status: 'error',
      isVirtual: true,
    });
    const alpha = graph.nodes.find((node) => node.id === 'Alpha');
    expect(alpha).toMatchObject({ isSelected: true });
  });
});
