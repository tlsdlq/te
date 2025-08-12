const fetch = require('node-fetch');

exports.handler = async function(event) {
  const { bgImg, text, bgColor, textColor, fontSize } = event.queryStringParameters;

  try {
    const siteUrl = process.env.URL || 'https://cool-dusk-cb5c8e.netlify.app';
    const optimizedBgUrl = `${siteUrl}/.netlify/functions/optimized-bg?bgImg=${encodeURIComponent(bgImg)}`;

    const imageResponse = await fetch(optimizedBgUrl);
    if (!imageResponse.ok) {
      const errorBody = await imageResponse.text();
      throw new Error(`[optimized-bg failure] ${errorBody}`);
    }

    const finalWidth = parseInt(imageResponse.headers.get('x-image-width'), 10);
    const finalHeight = parseInt(imageResponse.headers.get('x-image-height'), 10);
    if (isNaN(finalWidth) || isNaN(finalHeight)) {
      throw new Error('Invalid image dimensions received from optimized-bg headers.');
    }

    const imageBuffer = await imageResponse.buffer();
    const imageBase64 = imageBuffer.toString('base64');
    const imageDataUri = `data:image/webp;base64,${imageBase64}`;

    // --- 자동 줄바꿈 로직 시작 ---

    const boxHeight = finalHeight * 0.25;
    const boxY = finalHeight - boxHeight;
    const textPaddingX = finalWidth * 0.03;
    const maxTextWidth = finalWidth - (textPaddingX * 2);

    const baseFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
    
    // 1. 자동 줄바꿈 처리
    const words = (text || '').split(' ');
    const lines = [];
    let currentLine = '';

    // 글자 너비 추정을 위한 계수 (조정이 필요할 수 있음)
    const charWidthFactor = 0.55;

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        // 예상 너비 계산
        const estimatedWidth = testLine.length * baseFontSize * charWidthFactor;

        if (estimatedWidth > maxTextWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) {
        lines.push(currentLine);
    }
    
    // 2. 줄 수에 따라 폰트 크기 동적 조절
    let finalFontSize = baseFontSize;
    if (lines.length > 2) {
      // 줄이 많아지면 폰트를 조금 줄여서 박스 안에 잘 보이도록 함
      finalFontSize = baseFontSize * Math.pow(0.95, lines.length - 2);
    }
    finalFontSize = Math.floor(finalFontSize);

    // 3. 여러 줄의 텍스트를 위한 <tspan> 요소 생성
    const lineHeight = finalFontSize * 1.2;
    const totalTextHeight = (lines.length > 0 ? lineHeight * (lines.length -1) : 0) + finalFontSize;
    
    // 텍스트 블록이 수직 중앙에 오도록 시작 y 좌표 계산
    const startY = boxY + (boxHeight / 2) - (totalTextHeight / 2) + (finalFontSize / 2);

    const textElements = lines.map((line, index) => {
        // 두 번째 줄부터 dy 속성으로 줄 간격 설정
        const dy = index === 0 ? 0 : lineHeight;
        return `<tspan x="${textPaddingX}" dy="${dy}">${line}</tspan>`;
    }).join('');
    
    // --- 자동 줄바꿈 로직 끝 ---

    const svg = `<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg">
            <image href="${imageDataUri}" x="0" y="0" width="100%" height="100%"/>
            <rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor || 'rgba(0,0,0,0.5)'}" />
            <text font-family="Arial, sans-serif" font-size="${finalFontSize}px" fill="${textColor || '#FFFFFF'}" text-anchor="start">
                <tspan x="${textPaddingX}" y="${startY}">${lines.length > 0 ? lines[0] : ''}</tspan>
                ${lines.slice(1).map((line, index) => `<tspan x="${textPaddingX}" dy="${lineHeight}">${line}</tspan>`).join('')}
            </text>
        </svg>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
      body: svg.trim().replace(/\s{2,}/g, ' '),
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
