const sharp = require('sharp');
const fetch = require('node-fetch');

exports.handler = async function(event) {
  const { bgImg } = event.queryStringParameters;
  if (!bgImg) return { statusCode: 400, body: 'Error: bgImg parameter is required.' };

  try {
    const siteUrl = process.env.URL || 'https://cool-dusk-cb5c8e.netlify.app';
    const proxyUrl = `${siteUrl}/.netlify/functions/image-proxy?url=${encodeURIComponent(bgImg)}`;

    const imageResponse = await fetch(proxyUrl);
    if (!imageResponse.ok) throw new Error(`Proxy fetch failed: ${imageResponse.status}`);
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const image = sharp(Buffer.from(imageBuffer));
    
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
    return { statusCode: 500, body: 'Error processing image.' };
  }
};
