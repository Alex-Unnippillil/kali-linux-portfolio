export type ConnectionEvent = {
  timestamp: string;
  action: string;
  summary: string;
  details: string;
};

export type DeviceFixture = {
  id: string;
  name: string;
  icon: string;
  type: string;
  status: string;
  vendor: string;
  address: string;
  firmware: string;
  battery: number;
  lastSeen: string;
  tags: string[];
  rssiSamples: number[];
  advertisement: {
    intervalMs: number;
    txPower: number;
    channels: number[];
  };
  services: string[];
  connectionHistory: ConnectionEvent[];
  notes: string;
  labOnly?: boolean;
  labInsights?: { title: string; value: string; description: string }[];
};

export type DiscoveryEvent = {
  id: string;
  deviceName: string;
  discoveredAt: string;
  rssi: number;
  note: string;
};

export const discoveryTimeline: DiscoveryEvent[] = [
  {
    id: 'bt-arc-sound',
    deviceName: 'ArcSound Pro Buds',
    discoveredAt: '2024-05-18T14:31:05Z',
    rssi: -46,
    note: 'Detected via advertising channel hop (37→38).',
  },
  {
    id: 'bt-neon-tag',
    deviceName: 'NeonTag Asset Tracker',
    discoveredAt: '2024-05-18T14:32:11Z',
    rssi: -63,
    note: 'Broadcasting iBeacon frame with telemetry block.',
  },
  {
    id: 'bt-apex-trainer',
    deviceName: 'Apex Trainer HRM',
    discoveredAt: '2024-05-18T14:33:18Z',
    rssi: -51,
    note: 'Paired previously; resumed encrypted connection.',
  },
  {
    id: 'bt-flux-pad',
    deviceName: 'FluxPad Game Controller',
    discoveredAt: '2024-05-18T14:34:42Z',
    rssi: -57,
    note: 'LE report flagged for firmware drift.',
  },
  {
    id: 'bt-lumen-desk',
    deviceName: 'LumenDesk Beacon',
    discoveredAt: '2024-05-18T14:36:09Z',
    rssi: -70,
    note: 'Lab-only beacon requiring elevated review.',
  },
];

export const bluetoothDevices: DeviceFixture[] = [
  {
    id: 'bt-arc-sound',
    name: 'ArcSound Pro Buds',
    icon: '🎧',
    type: 'Audio',
    status: 'Paired',
    vendor: 'Arcadia Audio Labs',
    address: 'D4:7C:8A:2B:90:1C',
    firmware: 'v3.2.1-lab',
    battery: 82,
    lastSeen: '2024-05-18T14:35:58Z',
    tags: ['low-latency', 'BLE Audio', 'ANC'],
    rssiSamples: [-48, -47, -45, -46, -44, -47, -45, -46, -48, -47],
    advertisement: {
      intervalMs: 160,
      txPower: -4,
      channels: [37, 38, 39],
    },
    services: ['Audio Sink', 'Battery Service', 'Device Information'],
    connectionHistory: [
      {
        timestamp: '2024-05-18T13:58:12Z',
        action: 'paired',
        summary: 'Secure pairing completed',
        details: 'Authenticated with LE Secure Connections using passkey entry.',
      },
      {
        timestamp: '2024-05-18T14:12:01Z',
        action: 'stream-start',
        summary: 'Audio stream initiated',
        details: 'Media controller opened high-bitrate profile for latency test clip.',
      },
      {
        timestamp: '2024-05-18T14:27:54Z',
        action: 'handoff',
        summary: 'Multipoint handoff to lab tablet',
        details: 'Stream rerouted to tablet while maintaining encrypted control channel.',
      },
    ],
    notes: 'Primary audio endpoint used for demonstrating multipoint BLE audio hand-offs.',
    labInsights: [
      {
        title: 'Packet Loss (Lab)',
        value: '0.4%',
        description: 'Derived from replayed sniffer capture over 5-minute sample.',
      },
      {
        title: 'Codec Negotiated',
        value: 'LC3 48 kHz',
        description: 'Lab mode exposes negotiated codec sequence from fixture logs.',
      },
    ],
  },
  {
    id: 'bt-neon-tag',
    name: 'NeonTag Asset Tracker',
    icon: '📦',
    type: 'IoT',
    status: 'Advertising',
    vendor: 'Northstar Logistics',
    address: 'C1:2A:9F:11:07:2D',
    firmware: '2.9.0-lab',
    battery: 54,
    lastSeen: '2024-05-18T14:34:13Z',
    tags: ['telemetry', 'iBeacon', 'warehouse'],
    rssiSamples: [-65, -64, -63, -62, -64, -66, -63, -62, -61, -63],
    advertisement: {
      intervalMs: 900,
      txPower: -8,
      channels: [37, 39],
    },
    services: ['iBeacon Payload', 'Telemetry Blocks'],
    connectionHistory: [
      {
        timestamp: '2024-05-18T10:05:22Z',
        action: 'battery-report',
        summary: 'Battery telemetry ingested',
        details: 'Voltage sag flagged but within accepted lab thresholds.',
      },
      {
        timestamp: '2024-05-18T12:41:18Z',
        action: 'geo-fence',
        summary: 'Geo-fence ping replayed',
        details: 'Fixture dataset shows movement from dock to packing bay.',
      },
    ],
    notes: 'Beacon dataset replays mobility events for offline tracking demos.',
  },
  {
    id: 'bt-apex-trainer',
    name: 'Apex Trainer HRM',
    icon: '⌚',
    type: 'Wearable',
    status: 'Trusted',
    vendor: 'Apex Athletics',
    address: 'F3:44:91:BC:51:0A',
    firmware: '5.4.2-lab',
    battery: 68,
    lastSeen: '2024-05-18T14:33:40Z',
    tags: ['heart-rate', 'secure pairing'],
    rssiSamples: [-53, -52, -51, -50, -51, -52, -53, -51, -50, -52],
    advertisement: {
      intervalMs: 220,
      txPower: -6,
      channels: [37, 38],
    },
    services: ['Heart Rate', 'Fitness Machine', 'Device Information'],
    connectionHistory: [
      {
        timestamp: '2024-05-18T09:22:43Z',
        action: 'paired',
        summary: 'Numeric comparison accepted',
        details: 'Operator verified passkey digits during lab orientation.',
      },
      {
        timestamp: '2024-05-18T11:06:09Z',
        action: 'data-sync',
        summary: 'Workout telemetry replayed',
        details: 'Lab dataset replays cadence + heart-rate metrics for export demo.',
      },
      {
        timestamp: '2024-05-18T13:58:49Z',
        action: 'alert',
        summary: 'Anomaly alert triggered',
        details: 'Simulated tachycardia event stored for clinician walkthrough.',
      },
    ],
    notes: 'Secure pairing workflow emphasises privacy-preserving BLE features.',
    labInsights: [
      {
        title: 'Encrypted Packets',
        value: '1,248',
        description: 'Count derived from offline PCAP included with simulator.',
      },
    ],
  },
  {
    id: 'bt-flux-pad',
    name: 'FluxPad Game Controller',
    icon: '🎮',
    type: 'Input',
    status: 'Paired',
    vendor: 'FluxLabs Interactive',
    address: 'AA:71:3C:88:42:FE',
    firmware: '1.8.7-lab',
    battery: 47,
    lastSeen: '2024-05-18T14:34:59Z',
    tags: ['low-latency', 'adaptive triggers'],
    rssiSamples: [-58, -56, -57, -55, -56, -57, -58, -56, -55, -57],
    advertisement: {
      intervalMs: 120,
      txPower: -2,
      channels: [37, 38, 39],
    },
    services: ['Gamepad HID', 'Haptics Control', 'Battery Service'],
    connectionHistory: [
      {
        timestamp: '2024-05-18T08:12:15Z',
        action: 'firmware-scan',
        summary: 'Firmware drift detected',
        details: 'Lab baseline compares HID descriptor against signed manifest.',
      },
      {
        timestamp: '2024-05-18T11:49:02Z',
        action: 'latency-test',
        summary: 'Input latency benchmarking',
        details: 'Fixture dataset replays 120 Hz polling metrics for overlay charts.',
      },
    ],
    notes: 'Controller dataset focuses on HID fuzzing safety checks in sandbox.',
    labInsights: [
      {
        title: 'HID Report Size',
        value: '78 bytes',
        description: 'Lab mode exposes parsed descriptor snapshot for teaching.',
      },
    ],
  },
  {
    id: 'bt-lumen-desk',
    name: 'LumenDesk Beacon',
    icon: '💡',
    type: 'Infrastructure',
    status: 'Quarantined',
    vendor: 'Lumen Labs',
    address: '9C:51:2E:4B:10:9D',
    firmware: '0.9.1-beta-lab',
    battery: 100,
    lastSeen: '2024-05-18T14:36:42Z',
    tags: ['lab-only', 'mesh', 'proximity'],
    rssiSamples: [-71, -70, -69, -72, -70, -69, -71, -70, -68, -69],
    advertisement: {
      intervalMs: 600,
      txPower: -12,
      channels: [37],
    },
    services: ['Mesh Provisioning', 'Diagnostics Beacon'],
    connectionHistory: [
      {
        timestamp: '2024-05-18T07:15:34Z',
        action: 'quarantine',
        summary: 'Device quarantined for review',
        details: 'Lab supervisor flagged unsigned firmware for educational walkthrough.',
      },
      {
        timestamp: '2024-05-18T12:22:08Z',
        action: 'lab-audit',
        summary: 'Audit log exported',
        details: 'Offline dataset includes provisioning transcript for students.',
      },
    ],
    notes: 'Visible only in Lab Mode to illustrate elevated review workflows.',
    labOnly: true,
    labInsights: [
      {
        title: 'Firmware Hash',
        value: '0xA41F…',
        description: 'Digest sourced from signed lab manifest for comparison exercises.',
      },
      {
        title: 'Mesh TTL',
        value: '03',
        description: 'Lab dataset reveals mesh hop limits for pathfinding analysis.',
      },
    ],
  },
];
