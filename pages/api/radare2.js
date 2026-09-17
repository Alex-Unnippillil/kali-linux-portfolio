import { boundedText, postOnly } from '../../lib/simulation-response';
export default async function handler(req, res) {
  if (!postOnly(req, res)) return;
  const { action, hex, file } = req.body || {};
  if (action === 'disasm') {
    if (!boundedText(hex) || !/^(?:[0-9a-fA-F]{2})+$/.test(hex)) return res.status(400).json({ error: 'Use an even number of hexadecimal digits, at most 8192.' });
    return res.status(200).json({ simulated: true, result: `[demo] Received ${hex.length / 2} bytes. Fixture: 90 = nop; c3 = ret (x86 examples). This is not disassembly of the supplied bytes. No native binary ran.` });
  }
  if (action === 'analyze') {
    if (!boundedText(file, 65536) || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file)) return res.status(400).json({ error: 'Use valid base64 text, at most 65536 characters.' });
    return res.status(200).json({ simulated: true, result: '[demo] Binary-analysis workflow fixture. No file was written, opened or executed. A real analysis would inspect format, sections, imports and symbols; those results are not inferred here.' });
  }
  return res.status(400).json({ error: 'Choose the disasm or analyze demonstration.' });
}
