// netlify/functions/placeholder.js
const fetch = require('node-fetch');

exports.handler = async function(event) {
  const { bgImg, text, bgColor, textColor, fontSize } = event.queryStringParameters;

  // bgImg 파라미터 체크는 유지
  if (!bgImg) {
    // ... 기존 코드와 동일
  }

  try {
    const siteUrl = process.env.URL || 'https://cool-dusk-cb5c8e.netlify.app';
    const optimizedBgUrl = `${siteUrl}/.netlify/functions/optimized-bg?bgImg=${encodeURIComponent(bgImg)}`;

    const imageResponse = await fetch(optimizedBgUrl);

    // ✨ --- 수정 1: 에러가 발생하면, 그 내용을 가져와서 새로운 에러를 발생시킨다 --- ✨
    if (!imageResponse.ok) {
      // optimized-bg가 보낸 실제 에러 메시지를 읽어옵니다.
      const errorBody = await imageResponse.text(); 
      // 더 자세한 에러 메시지를 생성합니다.
      throw new Error(`[optimized-bg 실패] Status ${imageResponse.status}: ${errorBody}`);
    }

    const finalWidth = parseInt(imageResponse.headers.get('x-image-width'), 10);
    const finalHeight = parseInt(imageResponse.headers.get('x-image-height'), 10);

    // 받은 헤더 값이 유효한지 확인
    if (isNaN(finalWidth) || isNaN(finalHeight)) {
      throw new Error('X-Image-Width 또는 X-Image-Height 헤더를 받지 못했습니다.');
    }

    // --- 정상 작동 시 SVG 생성 (기존 코드와 동일) ---
    const boxHeight = finalHeight * 0.25;
    const boxY = finalHeight - boxHeight;
    const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
    const textPaddingX = finalWidth * 0.03;
    const textY = boxY + (boxHeight / 2);
    const svg = `<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg"><image href="${optimizedBgUrl}" x="0" y="0" width="100%" height="100%"/><rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor || 'rgba(0,0,0,0.5)'}" /><text x="${textPaddingX}" y="${textY}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor || '#FFFFFF'}" text-anchor="start" dominant-baseline="middle">${text || ''}</text></svg>`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'image/svg+xml', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300, s-maxage=300' },
      body: svg.trim(),
    };

  } catch (err) {
    // ✨ --- 수정 2: 잡힌 에러 메시지를 그대로 SVG 이미지에 그려준다 --- ✨
    console.error(err); // Netlify 로그에도 에러 기록
    
    // SVG 텍스트로 표시하기 위해 특수문자를 변환
    const errorMessage = err.message.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // 에러 메시지를 여러 줄로 표시하는 SVG 생성
    const errorSvg = `
<svg width="900" height="400" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#f8d7da" />
    <text x="15" y="35" font-family="monospace" font-size="14" fill="#721c24">
        <tspan x="15" dy="1.2em">AN ERROR OCCURRED:</tspan>
        <tspan x="15" dy="1.5em">${errorMessage.substring(0, 80)}</tspan>
        <tspan x="15" dy="1.2em">${errorMessage.substring(80, 160)}</tspan>
        <tspan x="15" dy="1.2em">${errorMessage.substring(160, 240)}</tspan>
        <tspan x="15" dy="1.2em">${errorMessage.substring(240, 320)}</tspan>
    </text>
</svg>`;
    return { 
        statusCode: 500, 
        headers: { 'Content-Type': 'image/svg+xml', 'Access-Control-Allow-Origin': '*' }, 
        body: errorSvg.trim() 
    };
  }
};
