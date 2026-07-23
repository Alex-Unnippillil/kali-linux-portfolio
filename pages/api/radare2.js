const HEX_RE = /^[0-9a-f\s]+$/i;

const disassembleDemo = (hex) => {
  const bytes = hex.replace(/\s+/g, '').match(/.{1,2}/g) || [];
  return bytes.slice(0, 16).map((byte, index) => {
    const addr = `0x${(index).toString(16).padStart(4, '0')}`;
    return `${addr}  ${byte.padEnd(2, '0')}        demo.byte 0x${byte.padEnd(2, '0')}`;
  }).join('\n');
};

export default async function handler(req, res) {
  if (process.env.FEATURE_TOOL_APIS !== 'enabled') {
    res.status(501).json({ error: 'Not implemented' });
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, hex, file } = req.body || {};

  if (action === 'disasm') {
    if (typeof hex !== 'string' || !hex.trim() || !HEX_RE.test(hex) || hex.replace(/\s+/g, '').length > 512) {
      return res.status(400).json({ error: 'Provide up to 512 hexadecimal characters for the demo disassembler' });
    }
    return res.status(200).json({
      result: `${disassembleDemo(hex)}\n\nDemo mode: no radare2 binaries were executed.`,
    });
  }

  if (action === 'analyze') {
    if (typeof file !== 'string' || file.length > 1024 * 1024) {
      return res.status(400).json({ error: 'Provide a base64 sample up to 1 MiB for demo analysis' });
    }
    const size = Buffer.byteLength(file, 'base64');
    return res.status(200).json({
      result: [`Demo binary analysis`, `Decoded size: ${size} bytes`, 'Sections: .text, .data (simulated)', 'Imports: puts, exit (simulated)', 'No files were written and no external tools were executed.'].join('\n'),
    });
  }

  return res.status(400).json({ error: 'Invalid request' });
}
