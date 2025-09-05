# Thunar Open With and MIME Preferences

Thunar builds its **Open With** menu from the desktop's preferred applications and MIME associations. Use the XFCE tools or `xdg-mime` to make sure your choices are reflected.

## Set Preferred Applications

1. Launch the **Preferred Applications** dialog via `exo-preferred-applications`.
2. Use **MIME Type Editor** (`xfce4-mime-settings`) to assign default handlers for file types.
3. These utilities update `~/.config/mimeapps.list`, which Thunar reads on startup.

## Register Parole, Ristretto, and Xarchiver

Run the following to register these applications as defaults for common types (or edit `mimeapps.list` manually):

```bash
xdg-mime default parole.desktop video/mp4 video/x-matroska
xdg-mime default ristretto.desktop image/jpeg image/png
xdg-mime default xarchiver.desktop application/zip application/x-7z-compressed
```

To offer them as additional options instead of defaults, append them under `[Added Associations]` in `~/.config/mimeapps.list`:

```
[Added Associations]
video/mp4=parole.desktop;
image/jpeg=ristretto.desktop;
application/zip=xarchiver.desktop;
```

Restart Thunar (e.g., `thunar -q`) so it reloads the updated preferences. The **Open With** menu will now include Parole, Ristretto, and Xarchiver when appropriate.
