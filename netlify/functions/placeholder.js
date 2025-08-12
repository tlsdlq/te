const fetch = require('node-fetch');

exports.handler = async function(event) {
  const { bgImg, text, bgColor, textColor, fontSize, maxWidth } = event.queryStringParameters;
  if (!bgImg) {
    const errorSvg = `<svg width="500" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f8d7da" /><text x="10" y="50%" dominant-baseline="middle" font-family="monospace" font-size="14" fill="#721c24">Error: bgImg parameter is required.</text></svg>`;
    return { statusCode: 400, headers: { 'Content-Type': 'image/svg+xml' }, body: errorSvg };
  }

  try {
    const siteUrl = process.env.URL || 'https://cool-dusk-cb5c8e.netlify.app'; // 본인의 Netlify URL로 변경해주세요.

    // 1. 브라우저가 최종적으로 요청할 이미지 URL을 구성합니다.
    let optimizedBgUrl = `${siteUrl}/.netlify/functions/optimized-bg?bgImg=${encodeURIComponent(bgImg)}`;
    if (maxWidth) {
      optimizedBgUrl += `&maxWidth=${maxWidth}`;
    }

    // 2. 서버 내에서 위 URL을 호출하여 최종 이미지의 '크기'만 헤더에서 가져옵니다. (매우 효율적)
    const imageMetaResponse = await fetch(optimizedBgUrl);
    if (!imageMetaResponse.ok) {
      const errorBody = await imageMetaResponse.text();
      throw new Error(`[optimized-bg 실패] ${errorBody}`);
    }

    // 헤더에서 최종 이미지 크기를 읽어옵니다.
    const finalWidth = parseInt(imageMetaResponse.headers.get('x-image-width'), 10);
    const finalHeight = parseInt(imageMetaResponse.headers.get('x-image-height'), 10);
    if (isNaN(finalWidth) || isNaN(finalHeight)) {
      throw new Error('Invalid image dimensions received from optimized-bg headers.');
    }

    // 3. SVG의 href 속성에 넣기 위해 URL의 '&'를 '&amp;'로 치환합니다. (매우 중요!)
    const xmlEscapedUrl = optimizedBgUrl.replace(/&/g, '&amp;');

    const boxHeight = finalHeight * 0.25;
    const boxY = finalHeight - boxHeight;
    const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
    const textPaddingX = finalWidth * 0.03;
    const textY = boxY + (boxHeight / 2);

    // 4. 이스케이프 처리된 URL을 href에 사용합니다.
    const svg = `<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg">
                   <image href="${xmlEscapedUrl}" x="0" y="0" width="100%" height="100%"/>
                   <rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor || 'rgba(0,0,0,0.5)'}" />
                   <text x="${textPaddingX}" y="${textY}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor || '#FFFFFF'}" text-anchor="start" dominant-baseline="middle">${text || ''}</text>
                 </svg>`;

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
    const errorMessage = err.message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const errorSvg = `<svg width="900" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f8d7da" /><text x="15" y="35" font-family="monospace" font-size="14" fill="#721c24"><tspan x="15" dy="1.2em">AN ERROR OCCURRED:</tspan><tspan x="15" dy="1.5em">${errorMessage.substring(0, 80)}</tspan><tspan x="15" dy="1.2em">${errorMessage.substring(80, 160)}</tspan></text></svg>`;
    return { 
        statusCode: 500, 
        headers: { 'Content-Type': 'image/svg+xml', 'Access-Control-Allow-Origin': '*' }, 
        body: errorSvg.trim() 
    };
  }
};
