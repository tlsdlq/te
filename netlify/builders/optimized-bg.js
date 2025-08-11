// /netlify/builders/optimized-bg.js

const sharp = require('sharp');

exports.handler = async function(event) {
  const { bgImg } = event.queryStringParameters;

  if (!bgImg) {
    return { statusCode: 400, body: 'Error: bgImg parameter is required.' };
  }

  try {
    const siteUrl = process.env.URL || 'https://cool-dusk-cb5c8e.netlify.app';
    const proxyUrl = `${siteUrl}/.netlify/functions/image-proxy?url=${encodeURIComponent(bgImg)}`;

    const imageResponse = await fetch(proxyUrl);
    if (!imageResponse.ok) throw new Error(`Proxy fetch failed: ${imageResponse.status}`);
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const image = sharp(Buffer.from(imageBuffer));
    
    const metadata = await image.metadata();
    const { width, height } = metadata;

    const optimizedBuffer = await image
      .webp({ quality: 80 })
      .toBuffer();

    // 이 빌더는 최초 실행 후 결과물이 영구 저장됩니다.
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/webp',
        // 다음 빌더가 사용할 수 있도록 헤더에 이미지 크기 정보를 담아줍니다.
        'X-Image-Width': width,
        'X-Image-Height': height,
      },
      body: optimizedBuffer.toString('base64'),
      isBase64Encoded: true,
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'Error processing background image.' };
  }
};
