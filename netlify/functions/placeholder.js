const fetch = require('node-fetch');
const sharp = require('sharp'); // 이미지 크기를 얻기 위해 sharp를 직접 사용

exports.handler = async function(event) {
  // [개선 2] maxWidth 파라미터 추가
  const { bgImg, text, bgColor, textColor, fontSize, maxWidth } = event.queryStringParameters;
  if (!bgImg) {
    // bgImg가 없을 때 간단한 오류 SVG 반환
    const errorSvg = `<svg width="500" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f8d7da" /><text x="10" y="50%" dominant-baseline="middle" font-family="monospace" font-size="14" fill="#721c24">Error: bgImg parameter is required.</text></svg>`;
    return { statusCode: 400, headers: { 'Content-Type': 'image/svg+xml' }, body: errorSvg };
  }

  try {
    const siteUrl = process.env.URL || 'https://cool-dusk-cb5c8e.netlify.app';
    
    // [개선 1] Data URI 대신 함수 URL을 직접 참조하여 CSP 문제 해결
    let optimizedBgUrl = `${siteUrl}/.netlify/functions/optimized-bg?bgImg=${encodeURIComponent(bgImg)}`;
    if (maxWidth) {
      optimizedBgUrl += `&maxWidth=${maxWidth}`;
    }

    // [개선 1] 내부 fetch를 제거하고, 대신 원본 이미지 정보를 직접 가져와 크기만 계산합니다.
    const imageResponse = await fetch(decodeURIComponent(bgImg), {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36' }
    });
    if (!imageResponse.ok) throw new Error(`[Original Image Fetch Failed] ${imageResponse.status}`);
    
    const imageBuffer = await imageResponse.arrayBuffer();
    let imageProcessor = sharp(Buffer.from(imageBuffer));
    
    const originalMetadata = await imageProcessor.metadata();
    let finalWidth = originalMetadata.width;
    let finalHeight = originalMetadata.height;

    const maxW = parseInt(maxWidth, 10);
    if (!isNaN(maxW) && finalWidth > maxW) {
        // 비율에 맞춰 높이 계산
        finalHeight = Math.round((finalHeight * maxW) / finalWidth);
        finalWidth = maxW;
    }

    const boxHeight = finalHeight * 0.25;
    const boxY = finalHeight - boxHeight;
    const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
    const textPaddingX = finalWidth * 0.03;
    const textY = boxY + (boxHeight / 2);

    // [개선 1] href에 Data URI 대신 최적화된 이미지 URL을 삽입
    const svg = `<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg">
                   <image href="${optimizedBgUrl}" x="0" y="0" width="100%" height="100%"/>
                   <rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor || 'rgba(0,0,0,0.5)'}" />
                   <text x="${textPaddingX}" y="${textY}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor || '#FFFFFF'}" text-anchor="start" dominant-baseline="middle">${text || ''}</text>
                 </svg>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // SVG 자체도 캐싱
      },
      body: svg.trim(),
    };

  } catch (err) {
    const errorMessage = err.message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const errorSvg = `<svg width="900" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f8d7da" /><text x="15" y="35" font-family="monospace" font-size="14" fill="#721c24"><tspan x="15" dy="1.2em">AN ERROR OCCURRED:</tspan><tspan x="15" dy="1.5em">${errorMessage.substring(0, 80)}</tspan><tspan x="15" dy="1.2em">${errorMessage.substring(80, 160)}</tspan></text></svg>`;
    return { 
        statusCode: 500, 
        headers: { 'Content-Type': 'image/svg+xml', 'Access-Control-Allow-Origin': '*' }, 
        body: errorSvg.trim() 
    };
  }
};
