const fetch = require('node-fetch');

exports.handler = async function(event) {
  const { bgImg, text, bgColor, textColor, fontSize } = event.queryStringParameters;

  if (!bgImg) {
    const defaultSvg = `<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ccc" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="24" fill="#555">bgImg parameter is required.</text></svg>`;
    return { statusCode: 400, headers: { 'Content-Type': 'image/svg+xml', 'Access-Control-Allow-Origin': '*' }, body: defaultSvg };
  }

  try {
    const siteUrl = process.env.URL || 'https://cool-dusk-cb5c8e.netlify.app';
    const optimizedBgUrl = `${siteUrl}/.netlify/functions/optimized-bg?bgImg=${encodeURIComponent(bgImg)}`;

    const imageResponse = await fetch(optimizedBgUrl);
    if (!imageResponse.ok) {
      const errorBody = await imageResponse.text();
      throw new Error(`[optimized-bg 실패] ${errorBody}`);
    }

    const finalWidth = parseInt(imageResponse.headers.get('x-image-width'), 10);
    const finalHeight = parseInt(imageResponse.headers.get('x-image-height'), 10);
    if (isNaN(finalWidth) || isNaN(finalHeight)) {
      throw new Error('Invalid image dimensions received from optimized-bg headers.');
    }

    // ✨ --- 여기가 모든 것을 해결하는 최종 수정 지점입니다 --- ✨
    // 1. 응답 본문을 바이너리 데이터(Buffer)로 직접 읽어옵니다. (text()가 아님)
    const imageBuffer = await imageResponse.buffer(); 
    // 2. 이 바이너리 데이터를 Base64 텍스트로 다시 인코딩합니다.
    const imageBase64 = imageBuffer.toString('base64');
    
    // 이제 데이터는 손상되지 않은 완벽한 상태입니다.
    const imageDataUri = `data:image/webp;base64,${imageBase64}`;

    // SVG 요소 계산
    const boxHeight = finalHeight * 0.25;
    const boxY = finalHeight - boxHeight;
    const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
    const textPaddingX = finalWidth * 0.03;
    const textY = boxY + (boxHeight / 2);

    // 완전한 SVG 생성
    const svg = `<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg"><image href="${imageDataUri}" x="0" y="0" width="100%" height="100%"/><rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor || 'rgba(0,0,0,0.5)'}" /><text x="${textPaddingX}" y="${textY}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor || '#FFFFFF'}" text-anchor="start" dominant-baseline="middle">${text || ''}</text></svg>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
      body: svg.trim(),
    };

  } catch (err) {
    // 디버깅용 에러 처리
    const errorMessage = err.message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const errorSvg = `<svg width="900" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f8d7da" /><text x="15" y="35" font-family="monospace" font-size="14" fill="#721c24"><tspan x="15" dy="1.2em">AN ERROR OCCURRED:</tspan><tspan x="15" dy="1.5em">${errorMessage.substring(0, 80)}</tspan></text></svg>`;
    return { statusCode: 500, headers: { 'Content-Type': 'image/svg+xml', 'Access-Control-Allow-Origin': '*' }, body: errorSvg.trim() };
  }
};
