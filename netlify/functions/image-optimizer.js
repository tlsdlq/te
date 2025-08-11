const sharp = require('sharp');

exports.handler = async function(event) {
  const { url, w, h } = event.queryStringParameters;

  if (!url) {
    return { statusCode: 400, body: 'Missing "url" parameter' };
  }

  try {
    const decodedUrl = decodeURIComponent(url);
    
    // image-proxy를 거치지 않고 직접 이미지를 가져옵니다.
    const imageResponse = await fetch(decodedUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const sharpInstance = sharp(Buffer.from(imageBuffer));

    // 메타데이터를 읽어 원본 크기를 확인합니다.
    const metadata = await sharpInstance.metadata();
    const finalWidth = w ? parseInt(w, 10) : metadata.width;
    const finalHeight = h ? parseInt(h, 10) : metadata.height;
    
    // 리사이즈 및 최적화를 수행합니다.
    const optimizedBuffer = await sharpInstance
      .resize({
        width: finalWidth,
        height: finalHeight,
        fit: 'cover'
      })
      .webp({ quality: 80 })
      .toBuffer();

    // ✨✨✨ 핵심: 최적화된 "이미지 파일 자체"를 1년간 강력하게 캐싱하여 반환합니다.
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      },
      body: optimizedBuffer.toString('base64'),
      isBase64Encoded: true,
    };

  } catch (error) {
    console.error(error);
    // 간단한 에러 이미지를 반환할 수도 있습니다.
    return { statusCode: 500, body: 'Error processing image.' };
  }
};
