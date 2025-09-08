import Link from 'next/link';

interface TileProps {
  href: string;
  title: string;
  description: string;
}

const tiles: TileProps[] = [
  {
    href: '/get-kali/installer',
    title: 'Installer',
    description: 'Full-featured offline installer images for bare-metal setups.',
  },
  {
    href: '/get-kali/vms',
    title: 'VMs',
    description: 'Pre-built VirtualBox and VMware images for instant use.',
  },
  {
    href: '/get-kali/arm',
    title: 'ARM',
    description: 'Images for Raspberry Pi and other ARM devices.',
  },
  {
    href: '/get-kali/mobile',
    title: 'Mobile',
    description: 'Kali NetHunter for supported Android devices.',
  },
  {
    href: '/get-kali/cloud',
    title: 'Cloud',
    description: 'Amazon EC2, Azure, and other cloud provider images.',
  },
  {
    href: '/get-kali/containers',
    title: 'Containers',
    description: 'Docker and LXC images for lightweight deployments.',
  },
  {
    href: '/get-kali/live',
    title: 'Live',
    description: 'Bootable live images to run without installing.',
  },
  {
    href: '/get-kali/wsl',
    title: 'WSL',
    description: 'Windows Subsystem for Linux distribution for Windows 10/11.',
  },
];

function Tile({ href, title, description }: TileProps) {
  return (
    <Link
      href={href}
      className="border rounded p-4 flex flex-col hover:bg-gray-50 focus:outline-none"
    >
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="flex-1 text-sm mb-2">{description}</p>
      <span className="text-blue-500 hover:underline mt-auto">Learn more</span>
    </Link>
  );
}

export default function GetKaliPage() {
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Get Kali</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Tile key={tile.title} {...tile} />
        ))}
      </div>
    </main>
  );
}

