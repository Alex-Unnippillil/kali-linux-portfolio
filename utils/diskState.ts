export interface DiskPartition {
  id: string;
  name: string;
  role: string;
  sizeGB: number;
  usedGB: number;
  filesystem: string;
  mountPoint: string | null;
  isEncrypted: boolean;
  isBoot: boolean;
}

export interface Disk {
  id: string;
  name: string;
  device: string;
  sizeGB: number;
  model: string;
  partitions: DiskPartition[];
}

export interface DiskState {
  disks: Disk[];
}

export const filesystemOptions = ['ext4', 'xfs', 'btrfs', 'f2fs', 'fat32', 'ntfs', 'swap'];

export const initialDiskState: DiskState = {
  disks: [
    {
      id: 'disk-1',
      name: 'Samsung SSD 980 PRO 1TB',
      device: '/dev/nvme0n1',
      sizeGB: 953.9,
      model: 'Samsung SSD 980 PRO 1TB',
      partitions: [
        {
          id: 'disk-1-part1',
          name: 'EFI System',
          role: 'EFI System Partition',
          sizeGB: 0.6,
          usedGB: 0.3,
          filesystem: 'vfat',
          mountPoint: '/boot/efi',
          isEncrypted: false,
          isBoot: true,
        },
        {
          id: 'disk-1-part2',
          name: 'Root',
          role: 'System Root',
          sizeGB: 120,
          usedGB: 86.4,
          filesystem: 'ext4',
          mountPoint: '/',
          isEncrypted: false,
          isBoot: true,
        },
        {
          id: 'disk-1-part3',
          name: 'Home',
          role: 'User Home',
          sizeGB: 600,
          usedGB: 412.2,
          filesystem: 'ext4',
          mountPoint: '/home',
          isEncrypted: false,
          isBoot: false,
        },
        {
          id: 'disk-1-part4',
          name: 'Vault',
          role: 'Encrypted Archive',
          sizeGB: 200,
          usedGB: 72.5,
          filesystem: 'ext4',
          mountPoint: null,
          isEncrypted: true,
          isBoot: false,
        },
        {
          id: 'disk-1-part5',
          name: 'Swap',
          role: 'Swap Area',
          sizeGB: 32,
          usedGB: 12.1,
          filesystem: 'swap',
          mountPoint: '[SWAP]',
          isEncrypted: false,
          isBoot: false,
        },
      ],
    },
    {
      id: 'disk-2',
      name: 'Seagate Expansion 2TB',
      device: '/dev/sdb',
      sizeGB: 1862,
      model: 'Seagate Expansion HDD',
      partitions: [
        {
          id: 'disk-2-part1',
          name: 'Backup',
          role: 'Cold Storage',
          sizeGB: 1862,
          usedGB: 958.7,
          filesystem: 'ext4',
          mountPoint: '/mnt/backup',
          isEncrypted: false,
          isBoot: false,
        },
      ],
    },
  ],
};
