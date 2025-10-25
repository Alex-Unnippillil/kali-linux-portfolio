import DownloadCard from '../components/DownloadCard';

const scenarios = [
  {
    title: 'ISO',
    steps: [
      {
        text: 'Download the ISO',
        command: 'curl -O https://cdimage.kali.org/current/kali.iso',
      },
      {
        text: 'Verify the download',
        command: 'sha256sum kali.iso',
      },
      {
        text: 'Write to USB drive',
        command: 'sudo dd if=kali.iso of=/dev/sdX bs=4M status=progress && sync',
      },
    ],
  },
  {
    title: 'VM',
    steps: [
      {
        text: 'Download the VM image',
        command: 'curl -O https://cdimage.kali.org/current/kali-vm.7z',
      },
      {
        text: 'Extract the image',
        command: '7z x kali-vm.7z',
      },
      {
        text: 'Open in your hypervisor',
        command: 'vmplayer kali-linux.vmx',
      },
    ],
  },
  {
    title: 'Cloud',
    steps: [
      {
        text: 'Fetch the cloud image',
        command: 'curl -O https://cloud-images.kali.org/kali-cloud.qcow2',
      },
      {
        text: 'Boot with QEMU',
        command: 'qemu-system-x86_64 -m 2048 -hda kali-cloud.qcow2',
      },
    ],
  },
  {
    title: 'WSL',
    steps: [
      {
        text: 'Install from the store',
        command: 'wsl --install -d kali-linux',
      },
      {
        text: 'Launch the distro',
        command: 'wsl -d kali-linux',
      },
    ],
  },
  {
    title: 'Containers',
    steps: [
      {
        text: 'Pull the latest image',
        command: 'docker pull kalilinux/kali-rolling',
      },
      {
        text: 'Start a container',
        command: 'docker run -it kalilinux/kali-rolling bash',
      },
    ],
  },
  {
    title: 'NetHunter',
    steps: [
      {
        text: 'Download the APK',
        command: 'curl -O https://images.kali.org/nethunter/nethunter.apk',
      },
      {
        text: 'Install on device',
        command: 'adb install nethunter.apk',
      },
    ],
  },
];

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-ub-cool-grey text-white p-4 space-y-4">
      <h1 className="text-2xl font-bold">Download Options</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {scenarios.map((s) => (
          <DownloadCard key={s.title} title={s.title} steps={s.steps} />
        ))}
      </div>
    </div>
  );
}

