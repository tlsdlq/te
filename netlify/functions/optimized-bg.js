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
    const imageResponse = await fetch(decodedUrl);
    if (!imageResponse.ok) {
      throw new Error(`External image fetch failed: ${imageResponse.status}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // ⭐ --- [수정된 핵심 최적화 로직] --- ⭐
    const optimizedBuffer = await sharp(Buffer.from(imageBuffer))
      .resize({
        width: 1200, // 가로 너비만 1200px로 제한합니다.
        // height 값은 지정하지 않습니다. 이렇게 하면 sharp가 원본 비율에 맞춰 높이를 자동 계산합니다.
        withoutEnlargement: true // 원본 너비가 1200px보다 작으면 확대하지 않습니다.
      })
      .webp({ 
        quality: 75,
      })
      .toBuffer();

    // 최적화된 최종 이미지의 크기(비율이 유지된)를 읽어옵니다.
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
      body: optimizedBuffer.toString('base64'),
      // isBase64Encoded: true로 설정해도 Netlify는 내부적으로 처리합니다.
      // Buffer를 직접 반환하는 경우에만 isBase64Encoded가 필수적입니다.
      // 문자열 반환 시에는 false 또는 생략해도 괜찮지만, 명시적으로 true로 두어도 문제 없습니다.
      isBase64Encoded: true, 
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: `Error processing image: ${err.message}` };
  }
};
