export interface ArmBoard {
  slug: string;
  name: string;
  architectures: string[];
}

export const armBoards: ArmBoard[] = [
  {
    slug: 'raspberry-pi-2',
    name: 'Raspberry Pi 2',
    architectures: ['armhf'],
  },
  {
    slug: 'raspberry-pi-3',
    name: 'Raspberry Pi 3',
    architectures: ['armhf', 'arm64'],
  },
  {
    slug: 'raspberry-pi-4',
    name: 'Raspberry Pi 4',
    architectures: ['armhf', 'arm64'],
  },
  {
    slug: 'raspberry-pi-zero-w',
    name: 'Raspberry Pi Zero W',
    architectures: ['armhf'],
  },
  {
    slug: 'pinebook-pro',
    name: 'Pinebook Pro',
    architectures: ['arm64'],
  },
  {
    slug: 'beaglebone-black',
    name: 'BeagleBone Black',
    architectures: ['armhf'],
  },
  {
    slug: 'odroid-c2',
    name: 'ODROID-C2',
    architectures: ['arm64'],
  },
  {
    slug: 'banana-pi',
    name: 'Banana Pi',
    architectures: ['armhf'],
  },
];
