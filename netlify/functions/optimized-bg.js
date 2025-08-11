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
    
    // ✨ --- 여기가 핵심입니다 (1) --- ✨
    // 원본 이미지의 메타데이터에서 너비와 높이를 직접 읽습니다.
    const metadata = await image.metadata();
    const { width, height } = metadata;

    const optimizedBuffer = await image
      .webp({ quality: 80 }) // 리사이즈 없이 원본 크기 그대로 최적화
      .toBuffer();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        // ✨ --- 여기가 핵심입니다 (2) --- ✨
        // 다음 함수가 사용할 수 있도록 헤더에 이미지 크기를 담아줍니다.
        'X-Image-Width': width,
        'X-Image-Height': height,
      },
      body: optimizedBuffer.toString('base64'),
      isBase64Encoded: true,
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'Error processing image.' };
  }
};
