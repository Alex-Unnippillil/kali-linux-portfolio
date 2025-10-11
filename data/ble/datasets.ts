export interface CharacteristicData {
  uuid: string;
  name: string;
  value: string;
  description?: string;
}

export interface ServiceData {
  uuid: string;
  name: string;
  description: string;
  characteristics: CharacteristicData[];
}

export interface BleDataset {
  id: string;
  label: string;
  description: string;
  manufacturer: string;
  deviceType: string;
  location: string;
  lastSeen: string;
  tags: string[];
  highlights: string[];
  services: ServiceData[];
  sources: { label: string; url: string }[];
}

export const bleDatasets: BleDataset[] = [
  {
    id: 'enviro-watch-lab-node',
    label: 'EnviroWatch Lab Node',
    description:
      'Environmental beacon deployed in the security lab to track thermal drift, humidity, and air quality near the RF cage.',
    manufacturer: 'Nordic Semiconductor (simulated capture)',
    deviceType: 'Environmental sensor beacon',
    location: 'Red Team Lab – Sensor Grid A',
    lastSeen: '2024-05-18 14:23 UTC',
    tags: ['environmental', 'laboratory', 'iaq', 'battery'],
    highlights: [
      'Calibrated temperature readings remain within ±0.3 °C of the HVAC controller.',
      'IAQ baseline shows stable total VOC levels below 120 ppb during idle hours.',
      'Battery trend line suggests 21 days of headroom before the next rotation.',
    ],
    services: [
      {
        uuid: '0000181a-0000-1000-8000-00805f9b34fb',
        name: 'Environmental Sensing',
        description:
          'Aggregated temperature, humidity, and air quality telemetry exposed through the Environmental Sensing Service (ESS).',
        characteristics: [
          {
            uuid: '00002a6e-0000-1000-8000-00805f9b34fb',
            name: 'Temperature',
            value: '21.4 °C',
            description: '2-minute rolling average captured from the on-board SHT40 sensor.',
          },
          {
            uuid: '00002a6f-0000-1000-8000-00805f9b34fb',
            name: 'Humidity',
            value: '42 % RH',
            description: 'Relative humidity derived from the same sensing package as temperature.',
          },
          {
            uuid: '00002bd0-0000-1000-8000-00805f9b34fb',
            name: 'Total VOC Index',
            value: '118 ppb',
            description: 'TVOC baseline computed through a Bosch BME688 tuned for lab occupancy.',
          },
        ],
      },
      {
        uuid: '0000180f-0000-1000-8000-00805f9b34fb',
        name: 'Battery Service',
        description: 'Battery telemetry tracking the LiPo pack that powers the beacon.',
        characteristics: [
          {
            uuid: '00002a19-0000-1000-8000-00805f9b34fb',
            name: 'Battery Level',
            value: '76 %',
            description: 'State-of-charge derived from coulomb counting over the last 12 hours.',
          },
        ],
      },
      {
        uuid: '0000180a-0000-1000-8000-00805f9b34fb',
        name: 'Device Information',
        description: 'Firmware metadata for the Nordic-based prototype.',
        characteristics: [
          {
            uuid: '00002a29-0000-1000-8000-00805f9b34fb',
            name: 'Manufacturer Name',
            value: 'Unni Labs',
          },
          {
            uuid: '00002a24-0000-1000-8000-00805f9b34fb',
            name: 'Model Number',
            value: 'UW-ENV-2.1',
          },
          {
            uuid: '00002a28-0000-1000-8000-00805f9b34fb',
            name: 'Firmware Revision',
            value: 'FW-1.7.3-lab',
          },
        ],
      },
    ],
    sources: [
      {
        label: 'Bluetooth SIG – Environmental Sensing Service 1.0',
        url: 'https://www.bluetooth.com/specifications/specs/environmental-sensing-service-1-0/',
      },
      {
        label: 'Nordic Thingy:52 ESS sample documentation',
        url: 'https://developer.nordicsemi.com/nRF_Connect_SDK/doc/latest/nrf/samples/bluetooth/thingy52/README.html',
      },
    ],
  },
  {
    id: 'secure-locker-control',
    label: 'SecureLocker Control Pad',
    description:
      'BLE access controller protecting the hardware evidence locker. Dataset captures a healthy lock state with audit metadata.',
    manufacturer: 'Alpine Access Systems (simulated capture)',
    deviceType: 'Smart lock keypad and controller',
    location: 'HQ Secure Storage – Vestibule B',
    lastSeen: '2024-04-29 08:05 UTC',
    tags: ['physical-security', 'access-control', 'audit', 'battery'],
    highlights: [
      'Latest unlock token requested by the SOC dashboard originated from a valid on-site badge.',
      'Tamper switch remains sealed; last disturbance recorded 47 days ago.',
      'Battery backup is healthy at 92 %, satisfying the emergency egress SLA.',
    ],
    services: [
      {
        uuid: '0000ff01-0000-1000-8000-00805f9b34fb',
        name: 'Access Control',
        description:
          'Proprietary service mirroring keypad state, door position, and tamper information for the lock controller.',
        characteristics: [
          {
            uuid: '0000ff02-0000-1000-8000-00805f9b34fb',
            name: 'Lock State',
            value: 'Secured (bolts engaged)',
            description: 'Door magnet sensors indicate all three bolts are locked.',
          },
          {
            uuid: '0000ff03-0000-1000-8000-00805f9b34fb',
            name: 'Tamper Status',
            value: 'Sealed',
            description: 'No chassis intrusion; tamper loop continuity intact.',
          },
          {
            uuid: '0000ff04-0000-1000-8000-00805f9b34fb',
            name: 'Last Unlock Event',
            value: '2024-04-28 22:17 UTC – Badge 0x42A7',
            description: 'Audit trail entry referencing the facilities on-call engineer.',
          },
        ],
      },
      {
        uuid: '0000180f-0000-1000-8000-00805f9b34fb',
        name: 'Battery Service',
        description: 'Backup battery monitoring for the keypad and strike power supply.',
        characteristics: [
          {
            uuid: '00002a19-0000-1000-8000-00805f9b34fb',
            name: 'Battery Level',
            value: '92 %',
            description: 'Lead-acid backup supply measured at float voltage.',
          },
        ],
      },
      {
        uuid: '0000180a-0000-1000-8000-00805f9b34fb',
        name: 'Device Information',
        description: 'Device identity and firmware references for asset tracking.',
        characteristics: [
          {
            uuid: '00002a29-0000-1000-8000-00805f9b34fb',
            name: 'Manufacturer Name',
            value: 'Alpine Access Systems',
          },
          {
            uuid: '00002a24-0000-1000-8000-00805f9b34fb',
            name: 'Model Number',
            value: 'AAS-LOCK-4K',
          },
          {
            uuid: '00002a26-0000-1000-8000-00805f9b34fb',
            name: 'Firmware Revision',
            value: 'FW-3.2.9-secure',
          },
        ],
      },
    ],
    sources: [
      {
        label: 'Bluetooth Core Specification Vol 3, Part G – Attribute Protocol',
        url: 'https://www.bluetooth.com/specifications/specs/core-specification/',
      },
      {
        label: 'NIST SP 800-73-4: Interfaces for PIV',
        url: 'https://csrc.nist.gov/publications/detail/sp/800-73/4/final',
      },
    ],
  },
  {
    id: 'vibe-sense-industrial',
    label: 'VibeSense Industrial Monitor',
    description:
      'Edge sensor mounted on the milling line to surface vibration signatures, bearing temperature, and predictive maintenance data.',
    manufacturer: 'Acme Diagnostics (simulated capture)',
    deviceType: 'Industrial condition monitor',
    location: 'Manufacturing Floor – Line 3',
    lastSeen: '2024-05-02 19:42 UTC',
    tags: ['industrial', 'predictive-maintenance', 'vibration', 'temperature'],
    highlights: [
      'Vibration RMS remains below the maintenance threshold for spindle group 3.',
      'Bearing temperature sits 6 °C below the alert threshold after lubrication cycle.',
      'Analytics module projects next inspection in 11 days based on trend analysis.',
    ],
    services: [
      {
        uuid: '0000fe20-0000-1000-8000-00805f9b34fb',
        name: 'Condition Monitoring',
        description: 'Custom telemetry stream exposing vibration analytics and predictive scores.',
        characteristics: [
          {
            uuid: '0000fe21-0000-1000-8000-00805f9b34fb',
            name: 'Vibration RMS',
            value: '3.8 mm/s',
            description: 'ISO 10816 RMS velocity aggregated over the last 60 seconds.',
          },
          {
            uuid: '0000fe22-0000-1000-8000-00805f9b34fb',
            name: 'Bearing Temperature',
            value: '58.2 °C',
            description: 'Thermocouple reading filtered to remove transient spikes.',
          },
          {
            uuid: '0000fe23-0000-1000-8000-00805f9b34fb',
            name: 'Maintenance Score',
            value: '0.34 (Low risk)',
            description: 'Predictive model output; values above 0.75 require dispatch.',
          },
        ],
      },
      {
        uuid: '0000180a-0000-1000-8000-00805f9b34fb',
        name: 'Device Information',
        description: 'Identification, firmware, and serial metadata for CMDB linkage.',
        characteristics: [
          {
            uuid: '00002a29-0000-1000-8000-00805f9b34fb',
            name: 'Manufacturer Name',
            value: 'Acme Diagnostics',
          },
          {
            uuid: '00002a25-0000-1000-8000-00805f9b34fb',
            name: 'Serial Number',
            value: 'SN-VM-303842',
          },
          {
            uuid: '00002a27-0000-1000-8000-00805f9b34fb',
            name: 'Hardware Revision',
            value: 'HW-2.4',
          },
        ],
      },
    ],
    sources: [
      {
        label: 'Bluetooth SIG – Device Information Service 1.1',
        url: 'https://www.bluetooth.com/specifications/specs/device-information-service-1-1/',
      },
      {
        label: 'ISO 10816-3: Mechanical vibration evaluation guidelines',
        url: 'https://www.iso.org/standard/40111.html',
      },
    ],
  },
];
