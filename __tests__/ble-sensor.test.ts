import { filterServices } from '../components/apps/ble-sensor';
import { ServiceData } from '../utils/bleProfiles';

describe('filterServices', () => {
  const fixtures: ServiceData[] = [
    {
      uuid: 'battery_service',
      characteristics: [
        { uuid: 'battery_level', value: '95%' },
        { uuid: 'presentation_format', value: 'percentage' },
      ],
    },
    {
      uuid: 'device_information',
      characteristics: [
        { uuid: 'manufacturer_name_string', value: 'Demo Corp' },
      ],
    },
  ];

  it('returns all services when query is empty', () => {
    expect(filterServices(fixtures, '')).toEqual(fixtures);
  });

  it('returns service-level matches without removing characteristics', () => {
    expect(filterServices(fixtures, 'battery_service')).toEqual([fixtures[0]]);
  });

  it('returns only matching characteristics when service uuid does not match', () => {
    expect(filterServices(fixtures, '95%')).toEqual([
      {
        uuid: 'battery_service',
        characteristics: [{ uuid: 'battery_level', value: '95%' }],
      },
    ]);
  });

  it('returns an empty list when no values match', () => {
    expect(filterServices(fixtures, 'unknown-token')).toEqual([]);
  });
});
