// netlify/functions/optimized-bg.js

const sharp = require('sharp');
const fetch = require('node-fetch');

exports.handler = async function(event) {
  const { bgImg } = event.queryStringParameters;
  if (!bgImg) return { statusCode: 400, body: 'Error: bgImg parameter is required.' };

  try {
    const siteUrl = process.env.URL || 'https://cool-dusk-cb5c8e.netlify.app';
    const proxyUrl = `${siteUrl}/.netlify/functions/image-proxy?url=${encodeURIComponent(bgImg)}`;

    const imageResponse = await fetch(proxyUrl);
    if (!imageResponse.ok) {
        throw new Error(`Proxy fetch failed: ${imageResponse.status} ${await imageResponse.text()}`);
    }
    
    // ✨ --- 여기가 핵심적인 수정 부분입니다 --- ✨
    // 1. image-proxy가 보낸 Base64 '텍스트'를 받아옵니다.
    const base64Image = await imageResponse.text();
    // 2. Base64 텍스트를 실제 이미지 데이터(Buffer)로 디코딩합니다.
    const imageBuffer = Buffer.from(base64Image, 'base64');
    
    // 3. 디코딩된 이미지 버퍼를 sharp로 처리합니다.
    const image = sharp(imageBuffer);
    
    const metadata = await image.metadata();
    const { width, height } = metadata;

    const optimizedBuffer = await image.webp({ quality: 80 }).toBuffer();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/webp',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        'X-Image-Width': String(width),
        'X-Image-Height': String(height),
      },
      body: optimizedBuffer.toString('base64'),
      isBase64Encoded: true,
    };

  } catch (err) {
    // 에러를 더 자세히 볼 수 있도록 수정
    return { 
      statusCode: 500, 
      headers: { 'Content-Type': 'text/plain' },
      body: `Error in optimized-bg: ${err.message}` 
    };
  }
};
