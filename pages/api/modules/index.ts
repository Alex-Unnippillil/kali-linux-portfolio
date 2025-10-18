import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';

export const ModuleLogEntrySchema = z.object({
  level: z.string(),
  message: z.string(),
});

export const ModuleResultSchema = z.object({
  target: z.string(),
  status: z.string(),
});

export const ModuleOptionSchema = z.object({
  name: z.string(),
  label: z.string(),
});

export const ModuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  log: z.array(ModuleLogEntrySchema),
  results: z.array(ModuleResultSchema),
  data: z.string(),
  inputs: z.array(z.string()),
  lab: z.string(),
  options: z.array(ModuleOptionSchema),
});

export const ModuleIndexResponseSchema = z.array(ModuleSchema);

export const ModuleErrorSchema = z.object({
  error: z.string(),
});

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const filePath = path.join(process.cwd(), 'data', 'module-index.json');
    const fileContents = await fs.readFile(filePath, 'utf-8');
    const modules = ModuleIndexResponseSchema.parse(JSON.parse(fileContents));
    res.status(200).json(modules);
  } catch {
    const errorBody = ModuleErrorSchema.parse({
      error: 'Unable to load module index',
    });

    res.status(500).json(errorBody);
  }
}
