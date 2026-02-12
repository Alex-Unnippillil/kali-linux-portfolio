import {
  getBleDataset,
  getBleDatasetTags,
  listBleDatasets,
  searchBleDatasets,
} from '../utils/bleDatasets';

describe('BLE dataset catalog', () => {
  it('provides curated datasets with descriptive metadata', () => {
    const datasets = listBleDatasets();
    expect(datasets.length).toBeGreaterThan(0);

    datasets.forEach((dataset) => {
      expect(dataset.label).toBeTruthy();
      expect(dataset.description).toBeTruthy();
      expect(dataset.services.length).toBeGreaterThan(0);
      dataset.services.forEach((service) => {
        expect(service.name).toBeTruthy();
        expect(service.characteristics.length).toBeGreaterThan(0);
        service.characteristics.forEach((characteristic) => {
          expect(characteristic.name).toBeTruthy();
          expect(characteristic.value).toBeTruthy();
        });
      });
    });
  });

  it('can look up datasets by identifier', () => {
    const [first] = listBleDatasets();
    expect(first).toBeDefined();
    if (!first) return;
    const lookup = getBleDataset(first.id);
    expect(lookup).toBeDefined();
    expect(lookup?.label).toBe(first.label);
  });

  it('indexes tags and supports filtered search', () => {
    const tags = getBleDatasetTags();
    expect(tags.length).toBeGreaterThan(0);

    const datasets = listBleDatasets();
    const reference = datasets.find((dataset) => dataset.tags.length > 0);
    expect(reference).toBeDefined();
    if (!reference) return;

    const tag = reference.tags[0];
    const filtered = searchBleDatasets('', [tag]);
    expect(filtered.some((dataset) => dataset.id === reference.id)).toBe(true);

    const unmatched = searchBleDatasets('non-existent query');
    expect(unmatched).toEqual([]);
  });
});
