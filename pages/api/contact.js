const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX = 5;
const rateLimit = new Map();
export default function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ ok: false });
        return;
    }
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const now = Date.now();
    const entry = rateLimit.get(ip) || { count: 0, start: now };
    if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
        entry.count = 0;
        entry.start = now;
    }
    entry.count += 1;
    rateLimit.set(ip, entry);
    if (entry.count > RATE_LIMIT_MAX) {
        res.status(429).json({ ok: false, error: 'Too many requests' });
        return;
    }
    const { name = '', email = '', message = '', honeypot = '' } = req.body || {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();
    if (honeypot ||
        !trimmedName ||
        trimmedName.length > 100 ||
        !/\S+@\S+\.\S+/.test(trimmedEmail) ||
        !trimmedMessage ||
        trimmedMessage.length > 1000) {
        res.status(400).json({ ok: false, error: 'Invalid input' });
        return;
    }
    res.status(200).json({ ok: true });
}
