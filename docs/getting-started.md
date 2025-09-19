# Getting Started

This project is built with [Next.js](https://nextjs.org/).

## Prerequisites

- Node.js 20
- yarn or npm

## Installation

```bash
yarn install
```

## Running in Development

```bash
yarn dev
```

See the [Architecture](./architecture.md) document for an overview of how the project is organized.

For app contributions, see the [New App Checklist](./new-app-checklist.md).

## Profile switcher exports

The profile switcher lets you back up the saved Bluetooth profiles captured by the BLE Sensor app. To export:

1. Open **BLE Sensor** from the desktop and locate the **Saved Profiles** section.
2. Choose **Export Profiles** and provide a password when prompted. The download is an encrypted JSON file that embeds version metadata so future imports can detect compatibility.
3. Keep the password safe—imports require the same password and the checksum guard rejects altered files.

To restore, pick **Import Profiles**, select the exported file, and enter the password. Valid exports repopulate the switcher and notify other open tabs via the broadcast channel.
