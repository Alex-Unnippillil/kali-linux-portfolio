const sample = [
  {
    time: '10:00:01',
    src: '192.168.1.2',
    dst: 'example.com',
    detail: 'GET /login?user=admin&pass=secret'
  },
  {
    time: '10:00:05',
    src: '192.168.1.3',
    dst: 'intranet.local',
    detail: 'POST /api/token=abcd1234'
  }
];
export default function handler(req, res) {
  const encoded = Buffer.from(JSON.stringify(sample)).toString('base64');
  res.status(200).send(encoded);
}
