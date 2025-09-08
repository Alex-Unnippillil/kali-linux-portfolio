import PlatformCard from '../../components/platforms/PlatformCard';

export default function Installers() {
  const platforms = [
    {
      title: 'Virtual Machines',
      bullets: ['VMware', 'VirtualBox', 'Hyper-V'],
      thumbnail: '/themes/Yaru/apps/ssh.svg',
    },
    {
      title: 'Bare Metal',
      bullets: ['USB Installer', 'Boot ISO', 'NetInstall'],
      thumbnail: '/themes/Yaru/apps/gnome-control-center.png',
    },
    {
      title: 'WSL',
      bullets: ['Run Kali on Windows', 'Easy setup', 'Integration'],
      thumbnail: '/themes/Yaru/apps/bash.png',
    },
  ];

  return (
    <main className="space-y-4 p-4">
      <h1 className="text-2xl font-bold mb-4">Installers</h1>
      {platforms.map((platform) => (
        <PlatformCard key={platform.title} {...platform} />
      ))}
    </main>
  );
}
