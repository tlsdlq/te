import fetch from 'node-fetch';
import sharp from 'sharp';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const cacheDir = '/tmp/image-cache';
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

export default async (req, res) => {
  try {
    const { bgImg, text } = req.query;
    if (!bgImg) {
      res.status(400).send('Missing bgImg parameter');
      return;
    }

    // 캐시 키 생성 (배경이미지 URL 기반)
    const hash = crypto.createHash('sha1').update(bgImg).digest('hex');
    const cachedPath = path.join(cacheDir, `${hash}.webp`);

    let backgroundBuffer;
    if (fs.existsSync(cachedPath)) {
      backgroundBuffer = fs.readFileSync(cachedPath);
    } else {
      const response = await fetch(bgImg);
      if (!response.ok) throw new Error('Image download failed');
      const originalBuffer = await response.buffer();
      backgroundBuffer = await sharp(originalBuffer).webp({ quality: 90 }).toBuffer();
      fs.writeFileSync(cachedPath, backgroundBuffer);
    }

    // 텍스트 오버레이
    const svgText = `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <style>
        text { fill: white; font-size: 48px; font-family: sans-serif; font-weight: bold; }
      </style>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">${text || ''}</text>
    </svg>`;

    const outputBuffer = await sharp(backgroundBuffer)
      .composite([{ input: Buffer.from(svgText), gravity: 'center' }])
      .webp({ quality: 90 })
      .toBuffer();

    res.setHeader('Content-Type', 'image/webp');
    res.send(outputBuffer);
  } catch (err) {
    res.status(500).send(err.message);
  }
};
