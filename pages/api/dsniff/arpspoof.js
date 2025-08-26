const sample = [
  {
    time: '10:00:03',
    src: '192.168.1.1',
    dst: '192.168.1.2',
    detail: 'ARP reply is-at 00:11:22:33:44:55'
  },
  {
    time: '10:00:07',
    src: '192.168.1.2',
    dst: '192.168.1.1',
    detail: 'ARP reply is-at 66:77:88:99:aa:bb'
  }
];
export default function handler(req, res) {
  const encoded = Buffer.from(JSON.stringify(sample)).toString('base64');
  res.status(200).send(encoded);
}
