import React, { useState } from 'react';
import InstallStepper, { InstallStep } from '../components/InstallStepper';
import Tabs from '../components/Tabs';

const calamaresSteps: InstallStep[] = [
  {
    id: 'calamares-launch',
    title: 'Launch Calamares',
    description: 'Start the Calamares installer from the live session.',
    command: 'calamares',
  },
  {
    id: 'calamares-partition',
    title: 'List Disks',
    description: 'Inspect disks before partitioning.',
    command: 'sudo fdisk -l',
  },
  {
    id: 'calamares-user',
    title: 'Create User',
    description: 'Add a user in the installer.',
    command: 'sudo useradd -m <username>',
  },
  {
    id: 'calamares-install',
    title: 'Reboot',
    description: 'Finish installation and reboot.',
    command: 'sudo reboot',
  },
];

const lvmSteps: InstallStep[] = [
  {
    id: 'lvm-format',
    title: 'Format LUKS',
    description: 'Encrypt the target disk.',
    command: 'sudo cryptsetup luksFormat /dev/sdX',
  },
  {
    id: 'lvm-open',
    title: 'Open LUKS Container',
    description: 'Map the encrypted disk for use.',
    command: 'sudo cryptsetup open /dev/sdX cryptroot',
  },
  {
    id: 'lvm-vg',
    title: 'Create Volume Group',
    description: 'Initialize LVM on the encrypted container.',
    command: 'sudo vgcreate vg0 /dev/mapper/cryptroot',
  },
  {
    id: 'lvm-lv',
    title: 'Create Logical Volume',
    description: 'Allocate space for the root filesystem.',
    command: 'sudo lvcreate -L 20G -n root vg0',
  },
];

const bootSteps: Record<string, InstallStep[]> = {
  windows: [
    {
      id: 'win-download',
      title: 'Download ISO',
      description: 'Fetch the Kali image with PowerShell.',
      command:
        'Invoke-WebRequest -Uri https://cdimage.kali.org/kali.iso -OutFile kali.iso',
    },
    {
      id: 'win-verify',
      title: 'Verify Checksum',
      description: 'Validate the downloaded image.',
      command: 'Get-FileHash kali.iso -Algorithm SHA256',
    },
    {
      id: 'win-write',
      title: 'Write to USB',
      description: 'Use WSL dd to create the boot media.',
      command:
        'wsl sudo dd if=kali.iso of=/dev/sdX bs=4M status=progress oflag=sync',
    },
  ],
  mac: [
    {
      id: 'mac-download',
      title: 'Download ISO',
      description: 'Fetch the Kali image with curl.',
      command: 'curl -LO https://cdimage.kali.org/kali.iso',
    },
    {
      id: 'mac-verify',
      title: 'Verify Checksum',
      description: 'Verify the downloaded image.',
      command: 'shasum -a 256 kali.iso',
    },
    {
      id: 'mac-write',
      title: 'Write to USB',
      description: 'Use dd to create the boot media.',
      command: 'sudo dd if=kali.iso of=/dev/rdisk2 bs=4m && sync',
    },
  ],
  linux: [
    {
      id: 'linux-download',
      title: 'Download ISO',
      description: 'Fetch the Kali image with wget.',
      command: 'wget https://cdimage.kali.org/kali.iso',
    },
    {
      id: 'linux-verify',
      title: 'Verify Checksum',
      description: 'Verify the downloaded image.',
      command: 'sha256sum kali.iso',
    },
    {
      id: 'linux-write',
      title: 'Write to USB',
      description: 'Use dd to create the boot media.',
      command:
        'sudo dd if=kali.iso of=/dev/sdX bs=4M status=progress oflag=sync',
    },
  ],
};

const InstallGuides = () => {
  const [os, setOs] = useState<'windows' | 'mac' | 'linux'>('windows');

  return (
    <main className="min-h-screen bg-ub-cool-grey text-white p-4 space-y-12">
      <section>
        <h1 className="text-2xl font-bold mb-4">Calamares Installer</h1>
        <InstallStepper steps={calamaresSteps} />
      </section>
      <section>
        <h1 className="text-2xl font-bold mb-4">Encrypted LVM Setup</h1>
        <InstallStepper steps={lvmSteps} />
      </section>
      <section>
        <h1 className="text-2xl font-bold mb-4">Boot Media Creation</h1>
        <Tabs
          tabs={[
            { id: 'windows', label: 'Windows' },
            { id: 'mac', label: 'macOS' },
            { id: 'linux', label: 'Linux' },
          ]}
          active={os}
          onChange={(id) => setOs(id as 'windows' | 'mac' | 'linux')}
          className="mb-4"
        />
        <InstallStepper steps={bootSteps[os]} />
      </section>
    </main>
  );
};

export default InstallGuides;

