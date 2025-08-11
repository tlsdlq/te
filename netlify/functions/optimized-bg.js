// netlify/functions/optimized-bg.js

const sharp = require('sharp');
const fetch = require('node-fetch');

exports.handler = async function(event) {
  const { bgImg } = event.queryStringParameters;
  if (!bgImg) return { statusCode: 400, body: 'Error: bgImg parameter is required.' };

  try {
    // 1. 프록시를 거치지 않고, 원본 이미지 URL을 직접 사용합니다.
    const imageUrl = decodeURIComponent(bgImg);

    // 2. 외부 서버 차단을 막기 위해 브라우저인 척 위장합니다.
    const fetchOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
      }
    };
    
    // 3. 원본 이미지를 직접 fetch 합니다.
    const imageResponse = await fetch(imageUrl, fetchOptions);
    if (!imageResponse.ok) {
        throw new Error(`Original image fetch failed: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    
    // 4. 이제 데이터는 순수한 이미지 바이너리이므로, arrayBuffer()로 바로 받습니다.
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // 5. sharp로 처리합니다.
    const image = sharp(Buffer.from(imageBuffer));
    
    const metadata = await image.metadata();
    const { width, height } = metadata;

    const optimizedBuffer = await image.webp({ quality: 80 }).toBuffer();

    // 6. 정상적으로 결과를 반환합니다.
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
    return { 
      statusCode: 500, 
      headers: { 'Content-Type': 'text/plain' },
      body: `Error in optimized-bg: ${err.message}` 
    };
  }
};
