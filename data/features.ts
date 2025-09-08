export interface Feature {
  title: string;
  blurb: string;
  href: string;
}

export const features: Feature[] = [
  {
    title: 'VMware',
    blurb: 'Run Kali in a VMware virtual machine with snapshot support.',
    href: '/platforms/vmware',
  },
  {
    title: 'Cloud',
    blurb: 'Deploy Kali on popular cloud providers for on-demand access.',
    href: '/platforms/cloud',
  },
  {
    title: 'USB Live',
    blurb: 'Boot Kali from a portable USB drive and enable persistence.',
    href: '/platforms/usb-live',
  },
];
