import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface BuilderJob {
  id: string;
  status: 'pending' | 'completed' | string;
  artifactKey?: string;
}

export async function getJob(id: string): Promise<BuilderJob | null> {
  // Implementation would check a datastore or job queue.
  // Left as a stub to be mocked in tests.
  return null;
}

export async function getDownloadUrl(key: string): Promise<string> {
  const client = new S3Client({ region: process.env.KALI_BUILDER_REGION || 'us-east-1' });
  const command = new GetObjectCommand({
    Bucket: process.env.KALI_BUILDER_BUCKET,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn: 60 });
}
