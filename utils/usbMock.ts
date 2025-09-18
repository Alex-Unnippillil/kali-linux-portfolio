export type USBDeviceState = 'active' | 'idle' | 'busy' | 'problem' | 'ejected';

export interface USBDeviceHandle {
  pid: number;
  process: string;
  description: string;
  canRelease: boolean;
}

export interface USBDeviceNode {
  id: string;
  name: string;
  vendorId: string;
  productId: string;
  driver: string;
  location: string;
  speed?: string;
  state: USBDeviceState;
  notes?: string;
  problem?: string;
  handles?: USBDeviceHandle[];
  children?: USBDeviceNode[];
}

const cloneNode = (node: USBDeviceNode): USBDeviceNode => ({
  ...node,
  handles: node.handles?.map((handle) => ({ ...handle })),
  children: node.children?.map(cloneNode),
});

export const usbTopology: USBDeviceNode[] = [
  {
    id: 'root-hub',
    name: 'USB Root Hub (USB 3.1)',
    vendorId: '0x1D6B',
    productId: '0x0003',
    driver: 'xhci_hcd',
    location: 'Bus 001',
    speed: 'SuperSpeed',
    state: 'active',
    children: [
      {
        id: 'forensic-storage',
        name: 'Forensic Storage Bay',
        vendorId: '0x174C',
        productId: '0x5106',
        driver: 'uas',
        location: 'Port 2',
        speed: 'SuperSpeed',
        state: 'busy',
        notes: 'Mounted read-only for evidence processing.',
        handles: [
          {
            pid: 2140,
            process: 'evidence-mounter',
            description: 'Readonly mount session',
            canRelease: true,
          },
          {
            pid: 3280,
            process: 'timeline-indexer',
            description: 'Indexing timeline artifacts',
            canRelease: true,
          },
        ],
      },
      {
        id: 'pcap-adapter',
        name: 'Packet Capture Adapter',
        vendorId: '0x0BDA',
        productId: '0x8153',
        driver: 'r8152',
        location: 'Port 3',
        speed: 'High Speed',
        state: 'busy',
        notes: 'Capturing mirrored traffic from the lab switch.',
        handles: [
          {
            pid: 982,
            process: 'wireshark-live',
            description: 'Live capture session',
            canRelease: false,
          },
          {
            pid: 1674,
            process: 'packet-ring',
            description: 'Ring buffer writer',
            canRelease: true,
          },
        ],
      },
      {
        id: 'hid-keyboard',
        name: 'Mechanical Keyboard',
        vendorId: '0x04D9',
        productId: '0xA0D0',
        driver: 'usbhid',
        location: 'Port 6',
        speed: 'Full Speed',
        state: 'idle',
        notes: 'No pending input reports.',
      },
    ],
  },
  {
    id: 'lab-hub',
    name: 'Field Analysis Hub',
    vendorId: '0x2109',
    productId: '0x2813',
    driver: 'hub',
    location: 'Bus 002',
    speed: 'High Speed',
    state: 'active',
    children: [
      {
        id: 'rf-adapter',
        name: 'RF Capture Adapter',
        vendorId: '0x2601',
        productId: '0x0012',
        driver: 'rtl2832',
        location: 'Port 1',
        speed: 'High Speed',
        state: 'problem',
        problem: 'Driver mismatch detected (Code 10). Device halted.',
        notes: 'Last good profile saved in the troubleshooting guide.',
      },
      {
        id: 'secure-token',
        name: 'Hardware Auth Token',
        vendorId: '0x1050',
        productId: '0x0407',
        driver: 'hid-generic',
        location: 'Port 4',
        speed: 'Full Speed',
        state: 'idle',
        notes: 'Ready for multi-factor prompts.',
      },
    ],
  },
];

export const createUsbSnapshot = (): USBDeviceNode[] => usbTopology.map(cloneNode);
