import snapshot from '../../../public/demo-data/nmap/script-db-version.json';
export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const current = snapshot.sha || 'bundled-fixture';
  return res.status(200).json({ simulated: true, updateAvailable: false, current, latest: current, message: 'Bundled educational snapshot only. No upstream repository was queried or updated.' });
}
