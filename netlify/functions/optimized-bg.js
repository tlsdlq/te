const sharp = require('sharp');

exports.handler = async function(event) {
  const { bgImg, w, h } = event.queryStringParameters;

  if (!bgImg) {
    return { statusCode: 400, body: 'Error: bgImg parameter is required.' };
  }

  try {
    const siteUrl = process.env.URL || 'https://cool-dusk-cb5c8e.netlify.app';
    const proxyUrl = `${siteUrl}/.netlify/functions/image-proxy?url=${encodeURIComponent(bgImg)}`;

    const imageResponse = await fetch(proxyUrl);
    if (!imageResponse.ok) {
      throw new Error(`Fetch via proxy failed: ${imageResponse.status}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const image = sharp(Buffer.from(imageBuffer));
    
    const metadata = await image.metadata();
    const finalWidth = parseInt(w || metadata.width, 10);
    const finalHeight = parseInt(h || metadata.height, 10);

    const optimizedBuffer = await image
      .resize({ width: finalWidth, height: finalHeight, fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    // ✨ 가장 중요: 최적화된 "이미지"를 강력하게 캐시하여 반환
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      },
      body: optimizedBuffer.toString('base64'),
      isBase64Encoded: true,
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'Error processing image.' };
  }
};
