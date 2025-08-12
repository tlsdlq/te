const sharp = require('sharp');
const fetch = require('node-fetch');

exports.handler = async function(event) {
  const { bgImg, maxWidth } = event.queryStringParameters;
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
      throw new Error(`Original image fetch failed: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    
    // arrayBuffer()는 node-fetch v2와 v3 모두에서 호환됩니다.
    const imageBuffer = await imageResponse.arrayBuffer();
    
    let image = sharp(Buffer.from(imageBuffer));
    
    const metadata = await image.metadata();
    let { width, height } = metadata;

    // [개선 2] maxWidth 쿼리가 있으면 이미지 리사이징
    const maxW = parseInt(maxWidth, 10);
    if (!isNaN(maxW) && width > maxW) {
      image = image.resize({ width: maxW });
      // 리사이징 후 메타데이터 다시 얻기
      const newMetadata = await image.metadata();
      width = newMetadata.width;
      height = newMetadata.height;
    }

    const optimizedBuffer = await image.webp({ quality: 80 }).toBuffer();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/webp',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        // [개선 1] 이 함수는 이제 직접 호출되므로 더 이상 커스텀 헤더는 필요 없습니다.
        // 하지만 다른 용도를 위해 남겨둘 수 있습니다.
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
