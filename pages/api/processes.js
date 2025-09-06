export default function handler(_req, res) {
  const processes = [
    { pid: 1, ppid: 0, cpu: 0, mem: 0, name: 'init' },
  ];
  res.status(200).json({ processes });
}
