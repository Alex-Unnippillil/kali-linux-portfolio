# NetHunter Device Support & Installation

NetHunter brings Kali tools to Android phones and tablets. This project does **not** redistribute kernels or images; it only documents the process.

## Device Support Matrix

| Device | Type | Support | Kernel Notes |
| --- | --- | --- | --- |
| Nexus 5 (hammerhead) | Phone | Official | Custom NetHunter kernel |
| OnePlus 7 Pro (guacamole) | Phone | Official | Custom NetHunter kernel |
| Samsung Galaxy Tab S7 | Tablet | Community | Check community build threads |
| Generic Android | Phone/Tablet | Rootless | Uses stock kernel |

*For the latest list of devices, visit the [Kali NetHunter docs](https://www.kali.org/docs/nethunter/).* 

## Install Flows

### Full Image (Rooted)
1. Unlock the bootloader and install a custom recovery (e.g., TWRP).
2. Download the device-specific NetHunter image and matching kernel.
3. Flash both in recovery and reboot.
4. Install the NetHunter App Store to manage modules and updates.

### Rootless
1. Install the NetHunter app from the [NetHunter App Store](https://store.nethunter.com).
2. Follow the prompts to set up the proot environment.
3. Tools run without flashing a custom kernel.

## Disclaimers

- **Device kernels are unique.** Flashing the wrong kernel can soft-brick a device. Review the [NetHunter kernel builder notes](https://github.com/offensive-security/kali-nethunter/wiki/Kali-NetHunter-Kernel-Builder) before attempting an install.
- NetHunter images and kernels come with **no warranty**. Installing custom kernels may void warranties and is at your own risk.
- Only obtain packages from the official [NetHunter App Store](https://store.nethunter.com).
