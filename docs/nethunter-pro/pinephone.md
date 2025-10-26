# NetHunter Pro PinePhone Build & Flash Guide

This guide documents the current process for producing Kali-themed NetHunter Pro images for the PinePhone and PinePhone Pro. It covers both GNOME Phosh and KDE Plasma Mobile targets, performance overrides, validation checklists, and end-user flashing steps.

> **Scope.** The steps below assume you are building on a Debian or Kali workstation with the `repo` tool, a working cross-compilation toolchain, and at least 120 GB of free disk space. Building on native aarch64 hardware is possible but increases build time significantly.

---

## 1. Build preparation

1. Clone the NetHunter Pro manifest with PinePhone support:

   ```bash
   repo init -u https://gitlab.com/kaliproject/nethunter-pro/manifest.git -b pinephone
   repo sync --force-sync --no-tags --prune
   ```

2. Install required host packages:

   ```bash
   sudo apt update
   sudo apt install git build-essential ccache python3 git-lfs qemu-user-static simg2img jq
   ```

3. Export the device and UI targets you plan to build:

   ```bash
   export DEVICE=pinephone
   export UI_TARGET=phosh   # or plasma-mobile
   ```

4. Pull Kali artwork and accent packages that the UI layers expect:

   ```bash
   ./vendor/kali/artwork/fetch-assets.sh
   ```

---

## 2. Building GNOME Phosh images

1. Configure the build environment:

   ```bash
   source build/envsetup.sh
   lunch nethunter_${DEVICE}-${UI_TARGET}-user
   ```

2. Apply the compositor overrides before the final image is packed:

   ```bash
   cp -v ../../nethunter-pro/overrides/phoc.ini   $OUT/root/system/etc/phoc/phoc.ini
   cp -v ../../nethunter-pro/overrides/phosh.env  $OUT/root/system/etc/profile.d/phosh-netrunner.sh
   chmod 755 $OUT/root/system/etc/profile.d/phosh-netrunner.sh
   ```

3. Inject the Kali theming presets:

   ```bash
   cp vendor/kali/artwork/themes/Kali-Dark/gtk.css     $OUT/root/system/usr/share/themes/Kali-Dark/gtk-3.0/gtk.css
   cp vendor/kali/artwork/cursors/Kali-Dark/cursor    $OUT/root/system/usr/share/icons/Kali-Dark/cursors/left_ptr
   ```

4. Build the image:

   ```bash
   mka bootimage systemimage vendorimage oemimage
   mka nethunter-img
   ```

5. The finished `nethunter-${DEVICE}-${UI_TARGET}.img.xz` appears under `out/target/product/${DEVICE}/`.

---

## 3. Building KDE Plasma Mobile images

1. Switch the UI target and refresh the lunch combo:

   ```bash
   export UI_TARGET=plasma-mobile
   lunch nethunter_${DEVICE}-${UI_TARGET}-user
   ```

2. Apply the compositor tweaks for KWin:

   ```bash
   install -D -m 644 ../../nethunter-pro/overrides/kwin-lowlatency.conf \
     $OUT/root/system/etc/xdg/kdeglobals.d/netrunner-lowlatency.conf
   ```

3. Inject the Plasma theme and splash assets:

   ```bash
   rsync -a vendor/kali/artwork/plasma/KaliDark/ \
     $OUT/root/system/usr/share/plasma/look-and-feel/com.kali.nethunter.desktop/
   ```

4. Build the image artifacts:

   ```bash
   mka bootimage systemimage vendorimage oemimage
   mka nethunter-img
   ```

5. Verify the generated `nethunter-${DEVICE}-plasma-mobile.img.xz` under `out/target/product/${DEVICE}/`.

---

## 4. Performance validation checklist

Perform these smoke tests on both PinePhone (Allwinner A64) and PinePhone Pro (RK3399) reference hardware after flashing:

- **Touch input** – Confirm edge swipes, multi-touch gestures, and on-screen keyboard responsiveness using `libinput debug-events` over SSH.
- **Modem integration** – Validate voice calls and data sessions using `mmcli -m 0` while watching `ModemManager` logs. Ensure the APN defaults to `internet` unless the carrier requires a custom value.
- **Power management** – From the terminal, run `upower -i /org/freedesktop/UPower/devices/battery_BAT` every 10 minutes and log discharge rates with the display on and off.
- **Suspend/resume** – Trigger `systemctl suspend`, wait 60 seconds, then wake via the power button. Check `journalctl -b` for Phoc wake latency below 1.5 seconds.

Document any regressions in the shared QA sheet before publishing new builds.

---

## 5. Flashing instructions

1. Download the desired `.img.xz` archive and verify integrity:

   ```bash
   curl -O https://releases.kali.org/nethunter/pinephone/nethunter-${DEVICE}-${UI_TARGET}.img.xz
   curl -O https://releases.kali.org/nethunter/pinephone/nethunter-${DEVICE}-${UI_TARGET}.img.xz.sha256
   sha256sum -c nethunter-${DEVICE}-${UI_TARGET}.img.xz.sha256
   ```

2. Extract the image and write it to a microSD card (16 GB minimum):

   ```bash
   xz -dk nethunter-${DEVICE}-${UI_TARGET}.img.xz
   sudo dd if=nethunter-${DEVICE}-${UI_TARGET}.img of=/dev/sdX bs=8M status=progress conv=fsync
   sync
   ```

3. Insert the card into the PinePhone, hold volume down, and power on. The first boot can take up to 5 minutes.

4. (Optional) To flash the eMMC once the microSD build is verified:

   ```bash
   sudo pine64-installer --img nethunter-${DEVICE}-${UI_TARGET}.img --target emmc
   ```

---

## 6. Troubleshooting

| Symptom | Suggested fix |
| ------- | -------------- |
| UI stutters or tears | Confirm `/etc/phoc/phoc.ini` or `netrunner-lowlatency.conf` deployed. If GPU still saturates, drop `max-fps` to 50. |
| Modem not detected | Ensure the latest `eg25-manager` package is installed and the SIM tray is fully seated. Run `mmcli -m 0 --reset`. |
| Touch input offset | Re-run `sudo libinput measure touchpad-tap` and update `/usr/share/libinput/local-overrides.quirks` to match your panel revision. |
| Battery drains during suspend | Disable wake-on-touch in `/etc/libinput/local-overrides.quirks` and upgrade to the newest crust firmware. |
| Kali theming missing | Verify GTK/Plasma theme packages are present and that `/etc/profile.d/phosh-netrunner.sh` exports the `GTK_THEME` and `XCURSOR_THEME` variables. |

---

## 7. Release checklist

- [ ] Update the changelog with new build metadata and kernel versions.
- [ ] Upload images and SHA256 sums to the release bucket.
- [ ] Share validation results with the QA channel.
- [ ] Announce availability on the NetHunter blog with links back to this guide.

---

### Notes

The overrides and commands above have been exercised in automated CI builds, but physical hardware verification (touch, modem, suspend) still requires manual confirmation per release. Capture findings in the shared tracker so regression hunting remains straightforward.
