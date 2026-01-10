# Phaser Event Listeners

This document records active event listeners in the Phaser Matter demo after profiling and cleanup.

- **Keyboard listeners** – attached to the game container to capture left, right and jump controls. These are required for gameplay but may be replaced with Phaser's input system in the future.
- **Gamepad remap polling** – uses a 100ms `setInterval` while waiting for a button press during remapping to reduce CPU usage.
- **Matter `collisionstart`** – handles checkpoint and hazard collisions. Essential for gameplay; review if collision volume grows.

