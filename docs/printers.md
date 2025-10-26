# Printers app

The Printers utility simulates how the Kali desktop provisions network printers. It ships with a
mock discovery workflow, a manual add form, and a driver catalog tied to fixture data under
`data/printers/`.

## Discovery flow

- Uses `data/printers/discovery.json` to emulate an mDNS/SNMP/IPP sweep of `10.0.5.0/24`.
- Shows progress feedback, queue depth, capabilities, and portal URLs for discovered devices.
- Selecting a discovered device seeds the driver step with the recommended driver ID from the
  fixture.

## Manual add

- The form validates name, IP address, and model selection before moving to the driver step.
- Queue names are slugified automatically and used to derive the management portal URL.
- Matching drivers are surfaced immediately based on the selected model to mirror guided setup.

## Driver catalog

- Driver metadata comes from `data/printers/drivers.json` (vendor, version, supported models,
  features, certification targets, portal links).
- Recommended drivers are highlighted first; the rest of the catalog stays available for manual
  assignment.
- Once a driver is chosen the printer is saved to the managed list and the QR-enabled test page
  opens automatically.

## Test page preview

- The preview modal renders an 8.5" × 11" canvas with half-inch margins and dashed guides to verify
  printable area.
- A QR code is generated through the shared `<QRPreview />` component (from `components/apps/qr`)
  pointing to the printer portal.
- The sidebar summarizes next steps and driver metadata for quick audits.

Run `yarn test __tests__/components/apps/printers.test.tsx` to exercise the manual add flow in
isolation.
