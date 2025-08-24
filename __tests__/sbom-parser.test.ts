import { parseSbomObject } from '../lib/sbom';

describe('SBOM parsing', () => {
  it('parses CycloneDX components and dependencies', () => {
    const data = {
      bomFormat: 'CycloneDX',
      components: [
        {
          bomRef: 'comp1',
          name: 'comp1',
          version: '1.0.0',
          licenses: [{ license: { id: 'MIT' } }],
        },
      ],
      dependencies: [{ ref: 'comp1', dependsOn: ['comp2'] }],
    };
    const parsed = parseSbomObject(data);
    expect(parsed.components[0].licenses).toEqual(['MIT']);
    expect(parsed.graph.comp1).toEqual(['comp2']);
  });

  it('parses SPDX packages and relationships', () => {
    const data = {
      spdxVersion: 'SPDX-2.3',
      packages: [
        {
          SPDXID: 'pkg:1',
          name: 'pkg',
          versionInfo: '2.0.0',
          licenseDeclared: 'Apache-2.0',
        },
      ],
      relationships: [
        {
          spdxElementId: 'pkg:1',
          relatedSpdxElement: 'pkg:2',
          relationshipType: 'DEPENDS_ON',
        },
      ],
    };
    const parsed = parseSbomObject(data);
    expect(parsed.components[0].name).toBe('pkg');
    expect(parsed.graph['pkg:1']).toEqual(['pkg:2']);
  });

  it('throws with path on invalid schema', () => {
    expect(() => parseSbomObject({ bomFormat: 'CycloneDX' })).toThrow(
      '$.components'
    );
  });
});
