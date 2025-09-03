const { VERCEL_TOKEN, VERCEL_PROJECT_ID, DEPLOYMENT_ID, ANNOTATION_MESSAGE = 'Major deploy' } = process.env;

if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
  console.error('Missing VERCEL_TOKEN or VERCEL_PROJECT_ID');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${VERCEL_TOKEN}`,
  'Content-Type': 'application/json'
};

async function activateSpeedInsights() {
  const res = await fetch(`https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ speedInsights: { enabled: true } })
  });
  if (!res.ok) {
    throw new Error(`Enable Speed Insights failed: ${res.status} ${res.statusText}`);
  }
  console.log('Speed Insights activated');
}

async function annotateDeploy(message) {
  if (!DEPLOYMENT_ID) return;
  const res = await fetch(`https://api.vercel.com/v2/deployments/${DEPLOYMENT_ID}/annotations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message })
  });
  if (!res.ok) {
    throw new Error(`Annotation failed: ${res.status} ${res.statusText}`);
  }
  console.log('Deployment annotated');
}

(async () => {
  await activateSpeedInsights();
  await annotateDeploy(ANNOTATION_MESSAGE);
})();
