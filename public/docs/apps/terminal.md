# Terminal Help

This terminal emulates basic shell commands. Type commands and press Enter to execute.

- Use arrow keys to navigate history.
- Press `Ctrl+C` to cancel a running command.
- The `help` command lists available commands.

## Panel profiles

For automated testing or personalized layouts, the desktop session can be
saved and restored from the browser's developer console:

```js
window.panelProfiles.save('work');
window.panelProfiles.load('work');
```

The `save` method stores the current window positions and dock icons under a
named profile. `load` applies a saved profile and reloads the page to restore
the layout.
