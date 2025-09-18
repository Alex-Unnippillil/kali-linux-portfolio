import { publish, subscribe } from './pubsub';
import {
  saveProfile,
  loadProfile,
  ServiceData,
} from './bleProfiles';

type StepKey = 'request' | 'connect' | 'discover' | 'complete';
type BluetoothStatus =
  | 'idle'
  | 'requesting'
  | 'connecting'
  | 'discovering'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error';

interface BluetoothCharacteristicLike {
  uuid: string;
  readValue: () => Promise<unknown> | unknown;
}

interface BluetoothServiceLike {
  uuid: string;
  getCharacteristics: () => Promise<BluetoothCharacteristicLike[]>;
}

interface BluetoothRemoteGATTServerLike {
  connected: boolean;
  connect: () => Promise<BluetoothRemoteGATTServerLike>;
  disconnect: () => void;
  getPrimaryServices: () => Promise<BluetoothServiceLike[]>;
}

interface BluetoothDeviceLike extends EventTarget {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServerLike | null;
}

interface BluetoothAdapterLike {
  requestDevice: (options: BluetoothRequestDeviceOptions) => Promise<BluetoothDeviceLike>;
  getDevices?: () => Promise<BluetoothDeviceLike[]>;
}

interface BluetoothRequestDeviceOptions {
  acceptAllDevices?: boolean;
  optionalServices?: string[];
}

interface BluetoothState {
  supported: boolean;
  status: BluetoothStatus;
  step: StepKey;
  busy: boolean;
  deviceName?: string;
  batteryLevel: number | null;
  services: ServiceData[];
  error?: string;
  canRetry: boolean;
  lastDeviceId: string | null;
  fromCache: boolean;
}

const MAX_RETRIES = 3;
const LAST_DEVICE_KEY = 'ble:lastDeviceId';
const DEFAULT_PROMPT =
  'This application will request access to nearby Bluetooth devices. Continue?';

let currentState: BluetoothState = {
  supported: typeof navigator !== 'undefined' && !!(navigator as any).bluetooth,
  status: 'idle',
  step: 'request',
  busy: false,
  deviceName: undefined,
  batteryLevel: null,
  services: [],
  error: undefined,
  canRetry: false,
  lastDeviceId: null,
  fromCache: false,
};

let hydrated = false;
let currentDevice: BluetoothDeviceLike | null = null;
let currentServer: BluetoothRemoteGATTServerLike | null = null;
let manualDisconnect = false;
let reconnecting = false;
let broadcast: BroadcastChannel | null = null;

function emit(partial?: Partial<BluetoothState>) {
  if (partial) {
    currentState = { ...currentState, ...partial };
  }
  publish('bluetooth/state', { ...currentState });
}

function getBluetooth(): BluetoothAdapterLike | null {
  if (typeof navigator === 'undefined') return null;
  return ((navigator as unknown as { bluetooth?: BluetoothAdapterLike }).bluetooth || null);
}

function ensureBroadcastChannel() {
  if (broadcast || typeof window === 'undefined') return;
  if ('BroadcastChannel' in window) {
    broadcast = new BroadcastChannel('ble-profiles');
  }
}

async function hydrateFromCache() {
  if (hydrated) return;
  hydrated = true;
  ensureBroadcastChannel();
  if (typeof window === 'undefined') return;
  const lastId = window.localStorage.getItem(LAST_DEVICE_KEY);
  if (!lastId) {
    emit({ lastDeviceId: null });
    return;
  }
  emit({ lastDeviceId: lastId, step: 'complete', status: 'disconnected', canRetry: true, fromCache: true });
  try {
    const profile = await loadProfile(lastId);
    if (profile) {
      emit({
        deviceName: profile.name,
        services: profile.services,
        batteryLevel: profile.batteryLevel ?? null,
      });
    }
  } catch (error) {
    console.warn('Failed to hydrate Bluetooth profile', error);
  }
}

function deriveStepFromStatus(status: BluetoothStatus): StepKey {
  switch (status) {
    case 'connecting':
    case 'disconnected':
    case 'reconnecting':
      return 'connect';
    case 'discovering':
      return 'discover';
    case 'connected':
      return 'complete';
    case 'requesting':
    case 'idle':
    case 'error':
    default:
      return currentState.step;
  }
}

function friendlyError(error: unknown): string {
  if (!error) return 'An unknown error occurred.';
  if (error instanceof Error) {
    const domName = (error as DOMException).name;
    if (domName === 'NotAllowedError') {
      return 'Permission to access Bluetooth was denied.';
    }
    if (domName === 'NotFoundError') {
      return 'No Bluetooth devices were discovered.';
    }
    return error.message || 'An unknown Bluetooth error occurred.';
  }
  return 'An unknown Bluetooth error occurred.';
}

async function ensureDeviceHandle(reuse: boolean) {
  if (!reuse) {
    if (currentDevice) {
      currentDevice.removeEventListener('gattserverdisconnected', handleDisconnect);
    }
    currentDevice = null;
    return;
  }
  if (currentDevice || !currentState.lastDeviceId) return;
  const adapter = getBluetooth();
  if (!adapter?.getDevices) return;
  try {
    const devices = await adapter.getDevices();
    const match = devices.find((device) => device.id === currentState.lastDeviceId);
    if (match) {
      attachDevice(match);
    }
  } catch (error) {
    console.warn('Unable to recover Bluetooth device handle', error);
  }
}

function attachDevice(device: BluetoothDeviceLike) {
  if (currentDevice && currentDevice !== device) {
    currentDevice.removeEventListener('gattserverdisconnected', handleDisconnect);
  }
  currentDevice = device;
  currentDevice.addEventListener('gattserverdisconnected', handleDisconnect);
}

async function connectWithRetry(device: BluetoothDeviceLike) {
  if (!device.gatt) {
    throw new Error('The selected device does not expose a GATT server.');
  }
  let lastError: unknown = new Error('Unable to connect to device.');
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const server = await device.gatt.connect();
      return server;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }
  throw lastError;
}

function extractBatteryLevel(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (value instanceof DataView) {
    return value.byteLength > 0 ? value.getUint8(0) : null;
  }
  if (value instanceof Uint8Array) {
    return value.length > 0 ? value[0] : null;
  }
  if (value && typeof value === 'object' && 'buffer' in (value as { buffer?: ArrayBuffer })) {
    const buffer = (value as { buffer: ArrayBuffer }).buffer;
    if (buffer instanceof ArrayBuffer && buffer.byteLength > 0) {
      return new DataView(buffer).getUint8(0);
    }
  }
  return null;
}

function formatCharacteristicValue(value: unknown): string {
  if (value instanceof DataView) {
    if (value.byteLength === 0) return '[empty]';
    const text = new TextDecoder().decode(value.buffer);
    if (text.trim()) return text;
    return Array.from(new Uint8Array(value.buffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join(' ');
  }
  if (value instanceof Uint8Array) {
    if (value.length === 0) return '[empty]';
    return Array.from(value)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join(' ');
  }
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (value && typeof value === 'object' && 'buffer' in (value as { buffer?: ArrayBuffer })) {
    const buffer = (value as { buffer: ArrayBuffer }).buffer;
    if (buffer instanceof ArrayBuffer) {
      return formatCharacteristicValue(new DataView(buffer));
    }
  }
  return '[unreadable]';
}

async function readServices(server: BluetoothRemoteGATTServerLike) {
  const services: ServiceData[] = [];
  let batteryLevel: number | null = currentState.batteryLevel;
  const primary = await server.getPrimaryServices();
  for (const service of primary) {
    const characteristics = await service.getCharacteristics();
    const items = [];
    for (const characteristic of characteristics) {
      const raw = await characteristic.readValue();
      const value = formatCharacteristicValue(raw);
      if (
        service.uuid === 'battery_service' ||
        service.uuid === '0000180f-0000-1000-8000-00805f9b34fb' ||
        characteristic.uuid === 'battery_level' ||
        characteristic.uuid === '00002a19-0000-1000-8000-00805f9b34fb'
      ) {
        const maybeBattery = extractBatteryLevel(raw);
        if (maybeBattery !== null) {
          batteryLevel = maybeBattery;
        }
      }
      items.push({ uuid: characteristic.uuid, value });
    }
    services.push({ uuid: service.uuid, characteristics: items });
  }
  return { services, batteryLevel };
}

async function persistProfile(
  deviceId: string,
  name: string,
  services: ServiceData[],
  batteryLevel: number | null
) {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LAST_DEVICE_KEY, deviceId);
    } catch (error) {
      console.warn('Unable to persist Bluetooth cache key', error);
    }
  }
  try {
    await saveProfile(deviceId, {
      name,
      services,
      batteryLevel,
    });
    ensureBroadcastChannel();
    broadcast?.postMessage('update');
  } catch (error) {
    console.warn('Unable to persist Bluetooth profile', error);
  }
}

interface PairingOptions {
  bypassConfirm?: boolean;
  reuseDevice?: boolean;
  reason?: 'initial' | 'retry' | 'reconnect';
  prompt?: string;
}

async function requestPairing(options: PairingOptions = {}): Promise<boolean> {
  await hydrateFromCache();
  if (!currentState.supported) {
    emit({
      status: 'error',
      step: 'request',
      error: 'Web Bluetooth is not supported in this browser.',
      canRetry: false,
      busy: false,
    });
    return false;
  }
  if (currentState.busy) return false;

  if (!options.bypassConfirm && typeof window !== 'undefined') {
    const allowed = window.confirm(options.prompt ?? DEFAULT_PROMPT);
    if (!allowed) {
      emit({ status: 'idle', step: 'request', busy: false });
      return false;
    }
  }

  if (options.reason === 'reconnect') {
    emit({
      status: 'reconnecting',
      step: 'connect',
      busy: true,
      error: 'Connection lost. Trying to reconnect…',
      canRetry: true,
    });
  } else {
    emit({ status: 'requesting', step: 'request', busy: true, error: undefined, canRetry: false });
  }

  try {
    await ensureDeviceHandle(options.reuseDevice ?? false);
    const adapter = getBluetooth();
    if (!currentDevice) {
      if (!adapter) throw new Error('Bluetooth adapter unavailable.');
      const device = await adapter.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 'device_information'],
      });
      attachDevice(device);
    }

    if (!currentDevice) throw new Error('No Bluetooth device available.');

    emit({
      status: 'connecting',
      step: 'connect',
      deviceName: currentDevice.name || 'Unknown device',
      lastDeviceId: currentDevice.id,
      fromCache: options.reuseDevice ? currentState.fromCache : false,
    });

    currentServer = await connectWithRetry(currentDevice);
    emit({ status: 'discovering', step: 'discover' });

    const { services, batteryLevel } = await readServices(currentServer);

    emit({
      status: 'connected',
      step: 'complete',
      busy: false,
      services,
      batteryLevel,
      deviceName: currentDevice.name || 'Unknown device',
      error: undefined,
      canRetry: false,
      fromCache: false,
    });

    await persistProfile(
      currentDevice.id,
      currentDevice.name || 'Unknown device',
      services,
      batteryLevel
    );
    return true;
  } catch (error) {
    emit({
      status: 'error',
      step: deriveStepFromStatus('error'),
      error: friendlyError(error),
      busy: false,
      canRetry: true,
    });
    return false;
  }
}

function handleDisconnect() {
  if (manualDisconnect) {
    manualDisconnect = false;
    emit({ status: 'disconnected', step: 'connect', busy: false, canRetry: true });
    return;
  }
  if (reconnecting) return;
  reconnecting = true;
  requestPairing({ bypassConfirm: true, reuseDevice: true, reason: 'reconnect' })
    .catch(() => {
      emit({
        status: 'error',
        step: 'connect',
        busy: false,
        error: 'Unable to reconnect automatically. Please retry.',
        canRetry: true,
      });
    })
    .finally(() => {
      reconnecting = false;
    });
}

export function startPairing(options?: PairingOptions) {
  return requestPairing({ ...options, reason: options?.reason ?? 'initial' });
}

export function retryPairing() {
  return requestPairing({ bypassConfirm: true, reuseDevice: true, reason: 'retry' });
}

export function disconnectDevice() {
  if (!currentDevice && !currentServer) {
    emit({ status: 'idle', step: 'request', busy: false });
    return;
  }
  manualDisconnect = true;
  try {
    currentServer?.disconnect();
  } catch (error) {
    console.warn('Bluetooth disconnect failed', error);
  }
  currentServer = null;
  if (currentDevice) {
    currentDevice.removeEventListener('gattserverdisconnected', handleDisconnect);
    currentDevice = null;
  }
  emit({ status: 'disconnected', step: 'connect', busy: false, canRetry: true });
}

export function forgetDevice(deviceId: string) {
  if (currentState.lastDeviceId !== deviceId) return;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(LAST_DEVICE_KEY);
    } catch (error) {
      console.warn('Failed to clear Bluetooth cache key', error);
    }
  }
  if (currentDevice && currentDevice.id === deviceId) {
    currentDevice.removeEventListener('gattserverdisconnected', handleDisconnect);
    currentDevice = null;
    currentServer = null;
  }
  emit({
    lastDeviceId: null,
    deviceName: undefined,
    services: [],
    batteryLevel: null,
    status: 'idle',
    step: 'request',
    canRetry: false,
    fromCache: false,
  });
}

export function updateCachedDeviceName(deviceId: string, name: string) {
  if (currentState.lastDeviceId === deviceId) {
    emit({ deviceName: name });
  }
}

export function getBluetoothState(): BluetoothState {
  return { ...currentState };
}

export function subscribeToBluetooth(callback: (state: BluetoothState) => void) {
  void hydrateFromCache();
  return subscribe('bluetooth/state', (next) => {
    callback(next as BluetoothState);
  });
}

export function __resetBluetoothStateForTests() {
  currentDevice?.removeEventListener('gattserverdisconnected', handleDisconnect);
  currentDevice = null;
  currentServer = null;
  manualDisconnect = false;
  reconnecting = false;
  hydrated = false;
  currentState = {
    supported: typeof navigator !== 'undefined' && !!(navigator as any).bluetooth,
    status: 'idle',
    step: 'request',
    busy: false,
    deviceName: undefined,
    batteryLevel: null,
    services: [],
    error: undefined,
    canRetry: false,
    lastDeviceId: null,
    fromCache: false,
  };
  if (broadcast) {
    broadcast.close();
    broadcast = null;
  }
  emit();
}

