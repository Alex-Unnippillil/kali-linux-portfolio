# BLE Sensor Dataset Catalog

The BLE Sensor simulator now ships with a read-only catalog of curated datasets that
mirror common security lab deployments. Each dataset blends Bluetooth SIG service
definitions with real-world telemetry ranges so analysts can practice interpreting
characteristics without pairing to hardware.

## Included Datasets

| ID | Label | Scenario | Notable Services |
| --- | --- | --- | --- |
| `enviro-watch-lab-node` | EnviroWatch Lab Node | Environmental monitoring inside the red-team lab | Environmental Sensing, Battery, Device Information |
| `secure-locker-control` | SecureLocker Control Pad | Access control keypad guarding the evidence locker | Proprietary Access Control, Battery, Device Information |
| `vibe-sense-industrial` | VibeSense Industrial Monitor | Predictive maintenance sensor on the milling line | Condition Monitoring, Device Information |

Each profile provides:

- **Descriptive telemetry** – Friendly characteristic names and values rather than raw
  byte arrays so the training experience focuses on interpretation.
- **Analyst highlights** – Callouts that explain what the readings imply for security,
  operations, or maintenance.
- **Source material** – Links back to Bluetooth SIG service definitions and adjacent
  standards to support deeper research.

## Source Material

The datasets blend multiple references to stay accurate:

- Bluetooth SIG specifications for the [Environmental Sensing Service](https://www.bluetooth.com/specifications/specs/environmental-sensing-service-1-0/), [Device Information Service](https://www.bluetooth.com/specifications/specs/device-information-service-1-1/), and the Bluetooth Core Attribute Protocol.
- Nordic Semiconductor's [Thingy:52 ESS sample](https://developer.nordicsemi.com/nRF_Connect_SDK/doc/latest/nrf/samples/bluetooth/thingy52/README.html) for realistic laboratory sensor payloads.
- NIST [SP 800-73-4](https://csrc.nist.gov/publications/detail/sp/800-73/4/final) guidance on PIV badge interactions for access control vocabulary.
- ISO [10816-3 vibration guidelines](https://www.iso.org/standard/40111.html) to ground the industrial condition monitoring dataset.

These references are cited directly in the simulator UI so researchers can follow the
trail back to the originating material.
