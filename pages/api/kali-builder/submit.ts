import type { NextApiRequest, NextApiResponse } from 'next';
import { CodeBuildClient, StartBuildCommand } from '@aws-sdk/client-codebuild';
import { z } from 'zod';

const payloadSchema = z.object({
  repoUrl: z.string().url(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const parsed = payloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const projectName = process.env.AWS_CODEBUILD_PROJECT_NAME;
  if (!projectName) {
    return res.status(500).json({ error: 'Missing project configuration' });
  }

  const client = new CodeBuildClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    },
  });

  try {
    const command = new StartBuildCommand({
      projectName,
      environmentVariablesOverride: [
        { name: 'REPO_URL', value: parsed.data.repoUrl },
      ],
    });

    const result = await client.send(command);
    return res.status(200).json({ jobId: result.build?.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to start build' });
  }
}

