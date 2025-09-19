/**
 * Ambient declarations for incubating hardware access APIs that are not yet
 * part of TypeScript's DOM lib. Specs:
 * - Web Bluetooth: https://webbluetoothcg.github.io/web-bluetooth/
 * - WebUSB: https://wicg.github.io/webusb/
 * - Web Serial: https://wicg.github.io/serial/
 *
 * TODO: Drop these once upstream lib.dom includes the official IDL:
 *   - Web Bluetooth tracking issue: https://github.com/microsoft/TypeScript/issues/18481
 *   - WebUSB disconnect events: https://github.com/WICG/webusb/issues/213
 *   - Web Serial event shape: https://github.com/WICG/serial/issues/200
 */

export {};

declare global {
  type BluetoothServiceUUID = number | string;

  interface BluetoothLEScanFilter {
    services?: BluetoothServiceUUID[];
  }

  interface BluetoothRequestDeviceOptions {
    acceptAllDevices?: boolean;
    filters?: BluetoothLEScanFilter[];
    optionalServices?: BluetoothServiceUUID[];
  }

  interface Bluetooth {
    requestDevice(options?: BluetoothRequestDeviceOptions): Promise<BluetoothDevice>;
  }

  interface BluetoothDevice extends EventTarget {
    readonly id: string;
    readonly name?: string | null;
    readonly gatt?: BluetoothRemoteGATTServer | null;
    addEventListener(
      type: 'gattserverdisconnected',
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener(
      type: 'gattserverdisconnected',
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ): void;
  }

  interface BluetoothRemoteGATTServer {
    readonly connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
  }

  interface BluetoothRemoteGATTService {
    readonly uuid: string;
    getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
  }

  interface BluetoothRemoteGATTCharacteristic {
    readonly uuid: string;
    readValue(): Promise<DataView>;
  }

  interface USB extends EventTarget {
    requestDevice(options?: USBDeviceRequestOptions): Promise<USBDevice>;
  }

  interface USBDevice extends EventTarget {
    readonly productName?: string | null;
    readonly configuration: USBConfiguration | null;
    open(): Promise<void>;
    close(): Promise<void>;
    selectConfiguration(value: number): Promise<void>;
    claimInterface(interfaceNumber: number): Promise<void>;
    transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
    transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>;
    addEventListener(
      type: 'connect' | 'disconnect',
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener(
      type: 'connect' | 'disconnect',
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ): void;
  }

  interface USBConfiguration {
    readonly interfaces: USBInterface[];
  }

  interface USBInterface {
    readonly alternates: USBAlternateInterface[];
  }

  interface USBAlternateInterface {
    readonly endpoints: USBEndpoint[];
  }

  interface USBEndpoint {
    readonly direction: 'in' | 'out';
    readonly endpointNumber: number;
  }

  type USBTransferStatus = 'ok' | 'stall' | 'babble';

  interface USBOutTransferResult {
    readonly status: USBTransferStatus;
    readonly bytesWritten?: number;
  }

  interface USBInTransferResult {
    readonly status: USBTransferStatus;
    readonly data?: DataView;
  }

  interface USBDeviceFilter {
    vendorId?: number;
    productId?: number;
    classCode?: number;
    subclassCode?: number;
    protocolCode?: number;
    serialNumber?: string;
  }

  interface USBDeviceRequestOptions {
    filters?: USBDeviceFilter[];
    exclusionFilters?: USBDeviceFilter[];
  }

  interface Serial extends EventTarget {
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
    addEventListener(
      type: 'connect' | 'disconnect',
      listener: (event: Event & { readonly target: SerialPort }) => void,
      options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener(
      type: 'connect' | 'disconnect',
      listener: (event: Event & { readonly target: SerialPort }) => void,
      options?: boolean | EventListenerOptions
    ): void;
  }

  interface SerialPort extends EventTarget {
    readonly readable: ReadableStream<Uint8Array> | null;
    readonly writable?: WritableStream<Uint8Array> | null;
    open(options: SerialOptions): Promise<void>;
    close(): Promise<void>;
  }

  interface SerialPortRequestOptions {
    filters?: SerialPortFilter[];
  }

  interface SerialPortFilter {
    usbVendorId?: number;
    usbProductId?: number;
  }

  interface SerialOptions {
    baudRate: number;
    dataBits?: number;
    stopBits?: number;
    parity?: 'none' | 'even' | 'odd';
    bufferSize?: number;
    flowControl?: 'none' | 'hardware';
  }

  interface Navigator {
    readonly bluetooth?: Bluetooth;
    readonly usb?: USB;
    readonly serial?: Serial;
  }
}
