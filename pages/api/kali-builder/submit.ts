import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { z } from 'zod';
import { CodeBuildClient, StartBuildCommand } from '@aws-sdk/client-codebuild';

const schema = z.object({
  repoUrl: z.string().url(),
  branch: z.string().min(1),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const payload = schema.parse(req.body);
    const serialized = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', process.env.AWS_SECRET_ACCESS_KEY as string)
      .update(serialized)
      .digest('hex');

    const client = new CodeBuildClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    });

    const result = await client.send(
      new StartBuildCommand({
        projectName: process.env.CODEBUILD_PROJECT_NAME,
        environmentVariablesOverride: [
          { name: 'PAYLOAD', value: serialized },
          { name: 'SIGNATURE', value: signature },
        ],
      }),
    );

    return res.status(200).json({ id: result.build?.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    return res.status(500).json({ error: 'Failed to start build' });
  }
}

