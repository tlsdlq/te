const fetch = require('node-fetch');

exports.handler = async function(event) {
  const { bgImg, text, bgColor, textColor, fontSize } = event.queryStringParameters;

  if (!bgImg) {
    const defaultSvg = `<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ccc" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="24" fill="#555">bgImg parameter is required.</text></svg>`;
    return { 
        statusCode: 400, 
        headers: { 'Content-Type': 'image/svg+xml', 'Access-Control-Allow-Origin': '*' }, 
        body: defaultSvg 
    };
  }

  try {
    const siteUrl = process.env.URL || 'https://cool-dusk-cb5c8e.netlify.app';
    const optimizedBgUrl = `${siteUrl}/.netlify/functions/optimized-bg?bgImg=${encodeURIComponent(bgImg)}`;

    const imageResponse = await fetch(optimizedBgUrl);
    if (!imageResponse.ok) {
      const errorBody = await imageResponse.text();
      throw new Error(`[optimized-bg 실패] ${errorBody}`);
    }

    // 헤더에서 크기 정보를 가져옴
    const finalWidth = parseInt(imageResponse.headers.get('x-image-width'), 10);
    const finalHeight = parseInt(imageResponse.headers.get('x-image-height'), 10);
    if (isNaN(finalWidth) || isNaN(finalHeight)) {
        throw new Error('Invalid image dimensions received from optimized-bg headers.');
    }

    // 본문에서 Base64로 인코딩된 이미지 데이터를 텍스트로 읽어옵니다.
    const imageBase64 = await imageResponse.text();
    // 데이터 URI를 생성합니다.
    const imageDataUri = `data:image/webp;base64,${imageBase64}`;

    // SVG 요소들의 크기와 위치 계산
    const boxHeight = finalHeight * 0.25;
    const boxY = finalHeight - boxHeight;
    const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
    const textPaddingX = finalWidth * 0.03;
    const textY = boxY + (boxHeight / 2);

    // 이미지의 href에 데이터 URI를 직접 삽입하여 완전한 SVG를 생성합니다.
    const svg = `<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg"><image href="${imageDataUri}" x="0" y="0" width="100%" height="100%"/><rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor || 'rgba(0,0,0,0.5)'}" /><text x="${textPaddingX}" y="${textY}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor || '#FFFFFF'}" text-anchor="start" dominant-baseline="middle">${text || ''}</text></svg>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Access-Control-Allow-Origin': '*',
        // 최종 SVG는 텍스트가 바뀔 수 있으므로 캐시 시간을 적절히 설정합니다.
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
      body: svg.trim(),
    };

  } catch (err) {
    console.error(err); // Netlify 로그에 에러 기록
    
    // SVG 텍스트로 표시하기 위해 특수문자를 변환
    const errorMessage = err.message.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // 에러 메시지를 여러 줄로 표시하는 디버깅용 SVG 생성
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
