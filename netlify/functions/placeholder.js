const fetch = require('node-fetch');

/**
 * 텍스트를 주어진 최대 너비에 맞게 여러 줄로 나눕니다.
 * 정확한 픽셀 측정이 어려우므로, 글꼴 크기를 기반으로 한 글자 수로 너비를 추정합니다.
 * @param {string} text - 줄바꿈할 전체 텍스트
 * @param {number} maxWidth - 한 줄의 최대 픽셀 너비
 * @param {number} fontSize - 텍스트의 글꼴 크기
 * @returns {string[]} 각 줄의 텍스트를 담은 배열
 */
function wrapText(text, maxWidth, fontSize) {
  // 평균적인 문자 너비를 폰트 크기의 0.6배로 가정 (영문 기준, 한글은 더 넓음)
  // 한글과 영문이 섞여있을 경우를 대비해 0.5로 더 보수적으로 계산
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
  
  return lines.length > 0 ? lines : ['']; // 텍스트가 없는 경우에도 빈 배열이 아닌 빈 문자열 하나를 반환
}

exports.handler = async function(event) {
  const { bgImg, text, bgColor, textColor, fontSize } = event.queryStringParameters;

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

    const imageBuffer = await imageResponse.buffer();
    const imageBase64 = imageBuffer.toString('base64');
    const imageDataUri = `data:image/webp;base64,${imageBase64}`;

    const boxHeight = finalHeight * 0.25;
    const boxY = finalHeight - boxHeight;
    const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
    const textPaddingX = finalWidth * 0.03;

    // --- 줄바꿈 로직 시작 ---
    const textMaxWidth = finalWidth - (textPaddingX * 2);
    const textLines = wrapText(text || '', textMaxWidth, finalFontSize);
    
    // 여러 줄의 텍스트 블록 전체를 수직 중앙 정렬하기 위한 y좌표 계산
    const lineHeight = finalFontSize * 1.2; // 줄 간격을 1.2배로 설정
    const totalTextHeight = textLines.length * lineHeight;
    // 텍스트 블록 상단이 시작될 y 좌표
    const textBlockStartY = boxY + (boxHeight - totalTextHeight) / 2;

    const textElements = textLines.map((line, index) => {
        // 첫 번째 tspan은 기준점에서 시작하고, 이후 tspan들은 줄 간격(dy)만큼 아래로 이동합니다.
        const dy = index === 0 ? 0 : `${lineHeight}px`;
        // <tspan> 태그를 생성합니다.
        return `<tspan x="${textPaddingX}" dy="${dy}">${line.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</tspan>`;
    }).join('');
    // --- 줄바꿈 로직 끝 ---

    const svg = `<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg"><image href="${imageDataUri}" x="0" y="0" width="100%" height="100%"/><rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor || 'rgba(0,0,0,0.5)'}" /><text x="${textPaddingX}" y="${textBlockStartY}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor || '#FFFFFF'}" text-anchor="start" dominant-baseline="hanging">${textElements}</text></svg>`;

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
