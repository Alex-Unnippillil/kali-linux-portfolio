import {
  bleDatasets,
  BleDataset,
  CharacteristicData,
  ServiceData,
} from '../data/ble/datasets';

const cloneDataset = (dataset: BleDataset): BleDataset => ({
  ...dataset,
  tags: [...dataset.tags],
  highlights: [...dataset.highlights],
  services: dataset.services.map((service) => ({
    ...service,
    characteristics: service.characteristics.map((characteristic) => ({
      ...characteristic,
    })),
  })),
  sources: dataset.sources.map((source) => ({ ...source })),
});

export const listBleDatasets = (): BleDataset[] =>
  bleDatasets.map((dataset) => cloneDataset(dataset));

export const getBleDataset = (id: string): BleDataset | undefined => {
  const match = bleDatasets.find((dataset) => dataset.id === id);
  return match ? cloneDataset(match) : undefined;
};

export const getBleDatasetTags = (): string[] => {
  const tagSet = new Set<string>();
  bleDatasets.forEach((dataset) => {
    dataset.tags.forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
};

export const searchBleDatasets = (
  query: string,
  tagFilters: string[] = []
): BleDataset[] => {
  const normalized = query.trim().toLowerCase();
  const tags = new Set(tagFilters.map((tag) => tag.toLowerCase()));

  return listBleDatasets().filter((dataset) => {
    const matchesTag =
      tags.size === 0 ||
      dataset.tags.some((tag) => tags.has(tag.toLowerCase()));

    if (!matchesTag) {
      return false;
    }

    if (!normalized) {
      return true;
    }

    const haystack = [
      dataset.label,
      dataset.description,
      dataset.deviceType,
      dataset.manufacturer,
      dataset.location,
      dataset.tags.join(' '),
      dataset.highlights.join(' '),
      dataset.services.map((service) => service.name).join(' '),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalized);
  });
};

export type {
  BleDataset,
  ServiceData,
  CharacteristicData,
};
