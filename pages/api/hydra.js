import { CSRF_HEADER, verifyCsrf } from '../../utils/csrf';

const SERVICES = ['ssh', 'ftp', 'http-get', 'http-post-form', 'smtp'];

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!verifyCsrf(req)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  const { target = '', service = '', userList = '', passList = '' } = req.body || {};
  const trimmedTarget = String(target).trim();
  const trimmedService = String(service).trim().toLowerCase();

  if (
    !/^([a-zA-Z0-9.-]{1,255})$/.test(trimmedTarget) ||
    !SERVICES.includes(trimmedService) ||
    typeof userList !== 'string' ||
    typeof passList !== 'string' ||
    userList.length > 10000 ||
    passList.length > 10000
  ) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const output =
    'Hydra simulation complete. No real attack was performed.\n' +
    'Ethical use only. Documentation: https://www.kali.org/tools/hydra/\n' +
    'Ethics: https://www.kali.org/docs/policy/ethical-hacking/';

  return res.status(200).json({ output });
}
