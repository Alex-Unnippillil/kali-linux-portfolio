# NetHunter Pro PinePhone Overrides

These overrides are intended to be dropped into the rootfs of a PinePhone-based NetHunter Pro image during the final build stage. They bias the compositor stack toward lower latency and quicker wake times while retaining Kali theming hooks.

Copy the files in this directory to the target locations described below after the base image has been generated (see `docs/nethunter-pro/pinephone.md`):

| File | Target path | Purpose |
| ---- | ----------- | ------- |
| `phoc.ini` | `/etc/phoc/phoc.ini` | Applies compositor tweaks for Phosh sessions. |
| `phosh.env` | `/etc/profile.d/phosh-netrunner.sh` | Sets environment flags for Phosh shell components. |
| `kwin-lowlatency.conf` | `/etc/xdg/kdeglobals.d/netrunner-lowlatency.conf` | Tunes KWin on Plasma Mobile images. |

All overrides are optional but recommended for PinePhone and PinePhone Pro hardware. Review and adjust the values to suit downstream kernels or custom display stacks.
