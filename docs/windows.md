# Windows Guide

Run the Kali Linux Portfolio on Windows using WSLg and Win-KeX.

## Install from the Microsoft Store

1. [Enable WSL](https://learn.microsoft.com/windows/wsl/install) in an elevated PowerShell:
   ```powershell
   wsl --install
   ```
2. Open the [Kali Linux page in the Microsoft Store](https://apps.microsoft.com/store/detail/kali-linux/9PKR34TNCV07) and install it.
3. (Optional) Install [Windows Terminal](https://apps.microsoft.com/store/detail/windows-terminal/9N0DX20HK701) for a better CLI experience.

## GPU and WSLg notes

- WSLg on Windows 11 provides a Wayland display server with GPU acceleration for Linux apps.
- Update WSL and drivers so the GPU is available inside Kali:
  ```powershell
  wsl --update
  ```
- Install the latest GPU driver from your vendor with WSL support.
- GUI apps launched from Kali appear as native Windows windows and can use the GPU.

## Win-KeX features

Win-KeX offers a complete Kali desktop. Useful modes include:

- `win-kex --sl` – seamless mode, integrates Linux apps into the Windows desktop.
- `win-kex --win` – window mode, runs the desktop in a single window.
- `win-kex --esm` – enhanced session mode with RDP-like experience.

## Security considerations

- WSL shares the Windows network stack and filesystem; actions in Kali can impact the host.
- Keep both Windows and Kali packages updated before running security tools.
- Use lab or isolated networks and avoid storing sensitive Windows files inside the Kali home.

