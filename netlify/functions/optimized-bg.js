const sharp = require('sharp');
const fetch = require('node-fetch');

exports.handler = async function(event) {
  const { bgImg } = event.queryStringParameters;
  if (!bgImg) return { statusCode: 400, body: 'Error: bgImg parameter is required.' };

  try {
    const imageUrl = decodeURIComponent(bgImg);
    const fetchOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
      }
    };
    
    const imageResponse = await fetch(imageUrl, fetchOptions);
    if (!imageResponse.ok) {
      throw new Error(`Original image fetch failed: ${imageResponse.status}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const image = sharp(Buffer.from(imageBuffer));
    
    const metadata = await image.metadata();
    const { width, height } = metadata;

    const optimizedBuffer = await image.webp({ quality: 80 }).toBuffer();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/webp', // 반환 형식을 명확히 함
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        'X-Image-Width': String(width),
        'X-Image-Height': String(height),
      },
      // 이미지 데이터를 Base64로 인코딩하여 본문에 담아 반환
      body: optimizedBuffer.toString('base64'),
      isBase64Encoded: true, // Netlify에 이 본문이 Base64임을 알림
    };

  } catch (err) {
    return { 
      statusCode: 500, 
      headers: { 'Content-Type': 'text/plain' },
      body: `Error in optimized-bg: ${err.message}` 
    };
  }
};
