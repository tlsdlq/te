// /netlify/functions/optimized-bg.js

const sharp = require('sharp');
const fetch = require('node-fetch');

exports.handler = async function(event) {
  const { bgImg } = event.queryStringParameters;

  if (!bgImg) {
    return { statusCode: 400, body: 'Error: bgImg parameter is required.' };
  }

  try {
    const decodedUrl = decodeURIComponent(bgImg);
    // ⭐ [성능 개선] 프록시 함수 없이 직접 외부 이미지를 가져옵니다.
    const imageResponse = await fetch(decodedUrl);
    if (!imageResponse.ok) {
      throw new Error(`External image fetch failed: ${imageResponse.status}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // ⭐ --- [대역폭 절약 핵심 로직] --- ⭐
    const optimizedBuffer = await sharp(Buffer.from(imageBuffer))
      .resize({
        width: 1200, // 가로 너비를 1200px로 제한합니다.
        height: 630, // 세로 높이를 630px로 제한합니다. (Open Graph 표준 비율)
        fit: 'cover', // 비율이 맞지 않을 경우 잘라내어 채웁니다.
        withoutEnlargement: true // 원본이 1200x630보다 작으면 확대하지 않습니다.
      })
      .webp({ 
        quality: 75, // WebP 포맷으로 변환하고 품질을 75로 설정합니다.
      })
      .toBuffer();

    // 최적화된 최종 이미지의 크기를 읽어옵니다.
    const finalMetadata = await sharp(optimizedBuffer).metadata();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        // placeholder 함수가 사용할 수 있도록 최종 이미지 크기를 헤더에 담아줍니다.
        'X-Image-Width': String(finalMetadata.width),
        'X-Image-Height': String(finalMetadata.height),
      },
      // ⭐ [대역폭 절약] 작아진 이미지 버퍼를 Base64로 인코딩합니다.
      body: optimizedBuffer.toString('base64'),
      isBase64Encoded: false, // Netlify에서 자동으로 인코딩 해주므로 false로 설정하는 것이 안전합니다.
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: `Error processing image: ${err.message}` };
  }
};
