import { parseSbomObject } from '@lib/sbom';
import cyclonedxSample from './sbom-samples/cyclonedx.json';
import spdxSample from './sbom-samples/spdx.json';

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

  it('parses CycloneDX sample file', () => {
    const parsed = parseSbomObject(cyclonedxSample);
    expect(parsed.components.length).toBe(2);
    expect(parsed.graph.pkg1).toEqual(['pkg2']);
    expect(parsed.components[1].licenses).toEqual(['Apache-2.0']);
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

  it('parses SPDX sample file', () => {
    const parsed = parseSbomObject(spdxSample);
    expect(parsed.components.length).toBe(2);
    expect(parsed.graph['SPDXRef-Package-pkg1']).toEqual([
      'SPDXRef-Package-pkg2',
    ]);
  });

  it('throws with path on invalid schema', () => {
    expect(() => parseSbomObject({ bomFormat: 'CycloneDX' })).toThrow(
      '$.components'
    );
  });
});
