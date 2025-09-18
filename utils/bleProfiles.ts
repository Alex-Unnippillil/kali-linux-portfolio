export interface CharacteristicData {
  uuid: string;
  value: string;
}

export interface ServiceData {
  uuid: string;
  characteristics: CharacteristicData[];
}

export interface SavedProfile {
  deviceId: string;
  name: string;
  services: ServiceData[];
  batteryLevel?: number | null;
}

const getDir = async (): Promise<any> => {
  if (
    typeof navigator === 'undefined' ||
    !(navigator as any).storage?.getDirectory
  ) {
    throw new Error('OPFS not supported');
  }
  return await (navigator as any).storage.getDirectory();
};

export const saveProfile = async (
  deviceId: string,
  profile: Omit<SavedProfile, 'deviceId'>
): Promise<void> => {
  const dir = await getDir();
  const handle = await dir.getFileHandle(`${deviceId}.json`, { create: true });
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(profile));
  await writable.close();
};

export const loadProfile = async (
  deviceId: string
): Promise<SavedProfile | null> => {
  try {
    const dir = await getDir();
    const handle = await dir.getFileHandle(`${deviceId}.json`);
    const file = await handle.getFile();
    const data = JSON.parse(await file.text());
    return { deviceId, ...data } as SavedProfile;
  } catch {
    return null;
  }
};

export const loadProfiles = async (): Promise<SavedProfile[]> => {
  try {
    const dir = await getDir();
    const profiles: SavedProfile[] = [];
    for await (const [name, handle] of (dir as any).entries()) {
      if (!name.endsWith('.json')) continue;
      const file = await handle.getFile();
      const data = JSON.parse(await file.text());
      profiles.push({ deviceId: name.replace(/\.json$/, ''), ...data });
    }
    return profiles;
  } catch {
    return [];
  }
};

export const renameProfile = async (
  deviceId: string,
  newName: string
): Promise<void> => {
  const existing = await loadProfile(deviceId);
  if (existing) {
    await saveProfile(deviceId, {
      name: newName,
      services: existing.services,
      batteryLevel: existing.batteryLevel,
    });
  }
};

export const deleteProfile = async (deviceId: string): Promise<void> => {
  const dir = await getDir();
  await dir.removeEntry(`${deviceId}.json`);
};

