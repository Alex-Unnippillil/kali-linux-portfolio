import type { NextApiRequest, NextApiResponse } from 'next';
import sharp from 'sharp';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { title = 'Alex Unnippillil' } = req.query;
    const baseImage = path.join(process.cwd(), 'public/images/logos/logo_1200.png');

    const svg = `<svg width="1200" height="630">
      <style>
      .title { fill: #fff; font-size: 64px; font-family: sans-serif; font-weight: bold; }
      </style>
      <rect x="0" y="0" width="1200" height="630" fill="rgba(0,0,0,0.5)" />
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" class="title">${String(title).slice(0,80)}</text>
    </svg>`;

    const image = await sharp(baseImage)
      .composite([{ input: Buffer.from(svg), gravity: 'center' }])
      .png()
      .toBuffer();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(image);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate image' });
  }
}
