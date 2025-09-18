# Live Installer (Simulation)

The Live Installer app walks through a rehearsal of preparing a Kali Linux live USB with persistence. It mirrors the official workflow without touching disk state, so contributors and visitors can explore the process safely.

## Key capabilities

- **Step-by-step wizard** – Device selection, persistence sizing, filesystem choice, simulation run, and verification are split into clear stages with navigation controls and guidance text.
- **Data-loss reminders** – A persistent banner highlights that real installs wipe the chosen device. Links to the Kali documentation are embedded in each step for further reading.
- **Simulated execution** – Partitioning and persistence creation are represented with progress bars, estimated durations, and status text so the user can rehearse what will happen on the command line.
- **Verification demo** – The final step models checksum validation, including a controlled failure on the first attempt so the app can show recovery advice before succeeding on retry.
- **State persistence** – Wizard decisions are stored in `localStorage` via `useLiveInstallerState`. Closing and reopening the window resumes at the saved step with the previous selections intact.

## Typical flow

1. **Choose a device.** Pre-populated drives represent common USB sticks and portable SSDs. The default option is a fast NVMe enclosure, and each card highlights its capacity and usage notes.
2. **Allocate persistence.** A range slider limits choices to the realistic free space on the selected device, reserving system overhead automatically. Warnings trigger as the slider approaches the maximum recommended value.
3. **Pick a filesystem.** Radio cards describe `ext4`, `btrfs`, and `xfs` in plain language. Each option links to upstream documentation so the user can review trade-offs.
4. **Run the simulation.** Pressing **Start simulation** animates partitioning and persistence provisioning. Progress bars, ETA labels, and summary text capture the real installer stages while emphasising that no writes occur.
5. **Verify the media.** The app simulates checksum validation. A guided failure appears first with suggestions to reseat the drive or rerun the simulation. Retrying demonstrates a successful validation and unlocks the completion state.

## Resetting

Use the **Reset progress** button in the header to clear saved state and start over. This removes the `live-installer-state` entry from `localStorage` so the wizard returns to its default recommendations.

## Testing

- Unit coverage lives in `__tests__/liveInstaller.test.tsx`.
- The end-to-end happy path is automated in `playwright/live-installer.spec.ts`.
