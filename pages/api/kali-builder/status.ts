import type { NextApiRequest, NextApiResponse } from 'next';

interface StatusResponse {
  status: string;
  logs: string[];
}

async function fetchStatus(id: string): Promise<StatusResponse> {
  // Dynamic imports so tests can mock without installing AWS SDK
  const { CodeBuildClient, BatchGetBuildsCommand } = require('@aws-sdk/client-codebuild');
  const { CloudWatchLogsClient, GetLogEventsCommand } = require('@aws-sdk/client-cloudwatch-logs');

  const region = process.env.AWS_REGION || 'us-east-1';
  const buildClient = new CodeBuildClient({ region });
  const logClient = new CloudWatchLogsClient({ region });

  const buildData = await buildClient.send(new BatchGetBuildsCommand({ ids: [id] }));
  const build = buildData.builds?.[0];
  const status = build?.buildStatus ?? 'UNKNOWN';
  const group = build?.logs?.groupName;
  const stream = build?.logs?.streamName;
  let logs: string[] = [];
  if (group && stream) {
    const logData = await logClient.send(
      new GetLogEventsCommand({
        logGroupName: group,
        logStreamName: stream,
        startFromHead: true,
      }),
    );
    logs = logData.events?.map((e: { message?: string }) => e.message || '') || [];
  }
  return { status, logs };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) {
    res.status(400).json({ error: 'Missing build id' });
    return;
  }

  if (req.headers.accept === 'text/event-stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });

    const interval = setInterval(async () => {
      const data = await fetchStatus(id);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (['SUCCEEDED', 'FAILED', 'STOPPED'].includes(data.status)) {
        clearInterval(interval);
        res.end();
      }
    }, 1000);

    req.on('close', () => clearInterval(interval));
    return;
  }

  const data = await fetchStatus(id);
  res.status(200).json(data);
}

