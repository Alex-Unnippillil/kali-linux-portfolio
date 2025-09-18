export interface MockBluetoothOptions {
  batteryLevel?: number;
  failRequest?: boolean;
  failConnectAttempts?: number;
  id?: string;
  name?: string;
}

interface MockCharacteristicInit {
  uuid: string;
  read: () => Promise<unknown> | unknown;
}

class MockCharacteristic {
  public readonly uuid: string;
  private readonly reader: () => Promise<unknown> | unknown;

  constructor(init: MockCharacteristicInit) {
    this.uuid = init.uuid;
    this.reader = init.read;
  }

  async readValue(): Promise<unknown> {
    return await this.reader();
  }
}

class MockService {
  public readonly uuid: string;
  private readonly characteristics: MockCharacteristic[];

  constructor(uuid: string, characteristics: MockCharacteristic[]) {
    this.uuid = uuid;
    this.characteristics = characteristics;
  }

  async getCharacteristics(): Promise<MockCharacteristic[]> {
    return this.characteristics;
  }
}

class MockGATTServer {
  public connected = false;
  private attempts = 0;
  private readonly device: MockBluetoothDevice;
  private readonly options: Required<MockBluetoothOptions>;

  constructor(device: MockBluetoothDevice, options: Required<MockBluetoothOptions>) {
    this.device = device;
    this.options = options;
  }

  async connect(): Promise<MockGATTServer> {
    this.attempts += 1;
    if (this.options.failConnectAttempts > 0 && this.attempts <= this.options.failConnectAttempts) {
      throw new Error('GATT connection failed');
    }
    this.connected = true;
    return this;
  }

  disconnect(): void {
    if (!this.connected) return;
    this.connected = false;
    this.device.dispatchEvent(new Event('gattserverdisconnected'));
  }

  async getPrimaryServices(): Promise<MockService[]> {
    return this.device.services;
  }
}

export class MockBluetoothDevice extends EventTarget {
  public readonly id: string;
  public name: string;
  public gatt: MockGATTServer;
  public services: MockService[];

  private batteryLevel: number;

  constructor(options: Required<MockBluetoothOptions>) {
    super();
    this.id = options.id;
    this.name = options.name;
    this.batteryLevel = options.batteryLevel;
    this.services = [
      new MockService('battery_service', [
        new MockCharacteristic({
          uuid: 'battery_level',
          read: () => {
            const buffer = new ArrayBuffer(1);
            new DataView(buffer).setUint8(0, this.batteryLevel);
            return new DataView(buffer);
          },
        }),
      ]),
      new MockService('device_information', [
        new MockCharacteristic({
          uuid: 'serial_number',
          read: () => 'SN-123456',
        }),
      ]),
    ];
    this.gatt = new MockGATTServer(this, options);
  }

  updateBatteryLevel(level: number) {
    this.batteryLevel = Math.max(0, Math.min(100, Math.floor(level)));
  }

  simulateDisconnect() {
    this.gatt.disconnect();
  }
}

function withDefaults(options?: MockBluetoothOptions): Required<MockBluetoothOptions> {
  return {
    batteryLevel: options?.batteryLevel ?? 82,
    failRequest: options?.failRequest ?? false,
    failConnectAttempts: options?.failConnectAttempts ?? 0,
    id: options?.id ?? 'mock-device',
    name: options?.name ?? 'Mock Sensor',
  };
}

export function createBluetoothMock(options?: MockBluetoothOptions) {
  const config = withDefaults(options);
  const device = new MockBluetoothDevice(config);

  const bluetooth = {
    async requestDevice() {
      if (config.failRequest) {
        throw new Error('No devices found');
      }
      return device;
    },
    async getDevices() {
      return [device];
    },
  };

  return { bluetooth, device };
}

export function installBluetoothMock(options?: MockBluetoothOptions) {
  const { bluetooth, device } = createBluetoothMock(options);
  const navigatorRef = (globalThis.navigator = globalThis.navigator || ({} as Navigator));
  Object.defineProperty(navigatorRef, 'bluetooth', {
    configurable: true,
    value: bluetooth,
  });
  return { bluetooth, device };
}
