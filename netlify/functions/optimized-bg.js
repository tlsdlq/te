// netlify/functions/placeholder.js

const fetch = require('node-fetch');

exports.handler = async function(event) {
  const { bgImg, text, bgColor, textColor, fontSize } = event.queryStringParameters;
  if (!bgImg) { /* 이전과 동일한 에러 처리 */ }

  try {
    const siteUrl = process.env.URL || 'https://cool-dusk-cb5c8e.netlify.app';
    const optimizedBgUrl = `${siteUrl}/.netlify/functions/optimized-bg?bgImg=${encodeURIComponent(bgImg)}`;

    // 1. optimized-bg를 호출하여 응답을 받습니다.
    const imageResponse = await fetch(optimizedBgUrl);
    if (!imageResponse.ok) {
      const errorBody = await imageResponse.text();
      throw new Error(`[optimized-bg 실패] ${errorBody}`);
    }

    // 2. 응답의 '본문'은 사용하지 않고, 오직 '헤더'에서 크기 정보만 가져옵니다.
    const finalWidth = parseInt(imageResponse.headers.get('x-image-width'), 10);
    const finalHeight = parseInt(imageResponse.headers.get('x-image-height'), 10);
    if (isNaN(finalWidth) || isNaN(finalHeight)) {
      throw new Error('Invalid image dimensions received from headers.');
    }

    // SVG 요소 계산
    const boxHeight = finalHeight * 0.25;
    const boxY = finalHeight - boxHeight;
    const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
    const textPaddingX = finalWidth * 0.03;
    const textY = boxY + (boxHeight / 2);

    // ✨ --- 최적화의 핵심 --- ✨
    // 3. SVG의 href 속성에 Base64 데이터가 아닌, optimized-bg 함수의 URL을 직접 넣습니다.
    const svg = `<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg"><image href="${optimizedBgUrl}" x="0" y="0" width="100%" height="100%"/><rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor || 'rgba(0,0,0,0.5)'}" /><text x="${textPaddingX}" y="${textY}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor || '#FFFFFF'}" text-anchor="start" dominant-baseline="middle">${text || ''}</text></svg>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Access-Control-Allow-Origin': '*',
        // 이 SVG 파일 자체는 매우 가벼우므로 캐시를 짧게 가져갑니다.
        'Cache-Control': 'public, max-age=600, s-maxage=600',
      },
      body: svg.trim(),
    };

  } catch (err) {
    // 디버깅용 에러 처리
    const errorMessage = err.message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const errorSvg = `<svg width="900" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f8d7da" /><text x="15" y="35" font-family="monospace" font-size="14" fill="#721c24"><tspan x="15" dy="1.2em">AN ERROR OCCURRED:</tspan><tspan x="15" dy="1.5em">${errorMessage.substring(0, 80)}</tspan></text></svg>`;
    return { statusCode: 500, headers: { 'Content-Type': 'image/svg+xml', 'Access-Control-Allow-Origin': '*' }, body: errorSvg.trim() };
  }
};```

#### **2. `optimized-bg.js` 수정 (강력하게 캐시되는 이미지 서버)**

이 함수는 우리가 최종적으로 완성했던, 직접 이미지를 가져와 처리하는 완벽한 코드 그대로입니다. `immutable` 캐시 설정이 핵심입니다.

```javascript
// netlify/functions/optimized-bg.js

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
        'Content-Type': 'image/webp',
        'Access-Control-Allow-Origin': '*',
        // ✨ --- 최적화의 핵심 --- ✨
        // 이 함수의 결과물(이미지)은 절대 변하지 않으므로, 영구 캐시합니다.
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        'X-Image-Width': String(width),
        'X-Image-Height': String(height),
      },
      // Netlify가 알아서 바이너리로 변환하도록 isBase64Encoded를 사용합니다.
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
