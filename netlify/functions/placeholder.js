const fetch = require('node-fetch');

// wrapText 헬퍼 함수는 그대로 유지합니다. (코드가 길어 생략)
function wrapText(text, maxWidth, fontSize) {
  const avgCharWidth = fontSize * 0.5;
  const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    if (currentLine.length === 0) {
      currentLine = word;
    } else if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.length > 0 ? lines : [''];
}

exports.handler = async function(event) {
  const { bgImg, text, bgColor, textColor, fontSize } = event.queryStringParameters;

  try {
    const siteUrl = process.env.URL || 'https://cool-dusk-cb5c8e.netlify.app';
    const optimizedBgUrl = `${siteUrl}/.netlify/functions/optimized-bg?bgImg=${encodeURIComponent(bgImg)}`;

    // 이미지 크기 정보를 얻기 위해 헤더만 확인합니다.
    const imageInfoResponse = await fetch(optimizedBgUrl);
    if (!imageInfoResponse.ok) {
      const errorBody = await imageInfoResponse.text();
      throw new Error(`[optimized-bg-check 실패] ${errorBody}`);
    }

    // 이전과 같이 헤더에서 이미지 크기를 가져옵니다.
    const finalWidth = parseInt(imageInfoResponse.headers.get('x-image-width'), 10);
    const finalHeight = parseInt(imageInfoResponse.headers.get('x-image-height'), 10);
    if (isNaN(finalWidth) || isNaN(finalHeight)) {
      throw new Error('Invalid image dimensions received from optimized-bg headers.');
    }

    // 텍스트 줄바꿈 및 좌표 계산 로직은 이전과 동일합니다.
    const boxHeight = finalHeight * 0.25;
    const boxY = finalHeight - boxHeight;
    const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
    const textPaddingX = finalWidth * 0.03;
    const textMaxWidth = finalWidth - (textPaddingX * 2);
    const textLines = wrapText(text || '', textMaxWidth, finalFontSize);
    const lineHeight = finalFontSize * 1.2;
    const totalTextHeight = textLines.length * lineHeight;
    const textBlockStartY = boxY + (boxHeight - totalTextHeight) / 2;
    const textElements = textLines.map((line, index) => {
        const dy = index === 0 ? 0 : `${lineHeight}px`;
        return `<tspan x="${textPaddingX}" dy="${dy}">${line.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</tspan>`;
    }).join('');

    // <image>의 'href'에 Base64 데이터 대신 최적화된 이미지 URL을 직접 사용합니다.
    const svg = `<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg"><image href="${optimizedBgUrl}" x="0" y="0" width="100%" height="100%"/><rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor || 'rgba(0,0,0,0.5)'}" /><text x="${textPaddingX}" y="${textBlockStartY}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor || '#FFFFFF'}" text-anchor="start" dominant-baseline="hanging">${textElements}</text></svg>`;

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
