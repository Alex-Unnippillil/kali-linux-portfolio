import type { NextApiRequest, NextApiResponse } from 'next';
import {
  readMobileOverrides,
  removeMobileOverride,
  upsertMobileOverride,
} from '../../../lib/mobileOverrides';
import type { MobileOverrideMap } from '../../../types/mobile';
import { ROTATION_OPTIONS } from '../../../types/mobile';

const ALLOWED_ROTATIONS = new Set<number>(ROTATION_OPTIONS);

const respondWithOverrides = (
  res: NextApiResponse,
  overrides: MobileOverrideMap,
) => {
  res.status(200).json({ overrides });
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (req.method === 'GET') {
      const overrides = await readMobileOverrides();
      respondWithOverrides(res, overrides);
      return;
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const { appId, dpi, rotation } = req.body ?? {};
      if (typeof appId !== 'string' || appId.trim() === '') {
        res.status(400).json({ error: 'appId is required' });
        return;
      }
      const parsedDpi = Number(dpi);
      if (!Number.isFinite(parsedDpi)) {
        res.status(400).json({ error: 'dpi must be a finite number' });
        return;
      }
      const parsedRotation = Number(rotation ?? 0);
      if (!ALLOWED_ROTATIONS.has(parsedRotation)) {
        res.status(400).json({ error: 'rotation must be one of 0, 90, 180, 270' });
        return;
      }
      const overrides = await upsertMobileOverride(appId, {
        dpi: parsedDpi,
        rotation: parsedRotation,
      });
      respondWithOverrides(res, overrides);
      return;
    }

    if (req.method === 'DELETE') {
      const { appId } = req.body ?? {};
      if (typeof appId !== 'string' || appId.trim() === '') {
        res.status(400).json({ error: 'appId is required' });
        return;
      }
      const overrides = await removeMobileOverride(appId);
      respondWithOverrides(res, overrides);
      return;
    }

    res.setHeader('Allow', 'GET,PUT,POST,DELETE');
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error) {
    console.error('Failed to handle mobile overrides request', error);
    res.status(500).json({ error: 'Failed to process mobile overrides request' });
  }
}
