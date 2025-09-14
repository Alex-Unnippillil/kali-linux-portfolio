import type { NextApiRequest, NextApiResponse } from 'next';
import { CodeBuildClient, BatchGetBuildsCommand } from '@aws-sdk/client-codebuild';
import { CloudWatchLogsClient, GetLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';

const codeBuild = new CodeBuildClient({});
const logsClient = new CloudWatchLogsClient({});

async function fetchStatus(id: string) {
  const buildResp = await codeBuild.send(new BatchGetBuildsCommand({ ids: [id] }));
  const build = buildResp.builds?.[0];
  const status = build?.buildStatus ?? 'UNKNOWN';
  const groupName = build?.logs?.groupName;
  const streamName = build?.logs?.streamName;
  let messages: string[] = [];
  if (groupName && streamName) {
    const logResp = await logsClient.send(
      new GetLogEventsCommand({ logGroupName: groupName, logStreamName: streamName }),
    );
    messages = (logResp.events ?? []).map((e) => e.message ?? '').filter(Boolean);
  }
  return { status, logs: messages };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const idParam = req.query.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!id) {
    res.status(400).json({ error: 'Missing id' });
    return;
  }
  const useStream = req.headers.accept === 'text/event-stream';
  if (useStream) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    const interval = setInterval(async () => {
      try {
        const data = await fetchStatus(id);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
        if (['SUCCEEDED', 'FAILED', 'FAULT', 'STOPPED'].includes(data.status)) {
          clearInterval(interval);
          res.end();
        }
      } catch (err: any) {
        clearInterval(interval);
        res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
        res.end();
      }
    }, 1000);
    req.on('close', () => clearInterval(interval));
    return;
  }
  try {
    const data = await fetchStatus(id);
    res.status(200).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

