
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
    
    // --- 개선된 로직 시작 ---

    const boxHeight = finalHeight * 0.25;
    const boxY = finalHeight - boxHeight;
    const textPaddingX = finalWidth * 0.03;

    // 1. 텍스트를 라인별로 분리
    const lines = (text || '').split('\n');

    // 2. 폰트 크기 계산 (줄 수에 따라 약간 작게 조정)
    const baseFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
    const finalFontSize = lines.length > 2 ? baseFontSize * 0.9 : baseFontSize;

    // 3. 여러 줄의 텍스트를 위한 <tspan> 요소 생성
    const lineHeight = finalFontSize * 1.2;
    const totalTextHeight = lineHeight * lines.length;
    
    // 텍스트 블록이 수직 중앙에 오도록 시작 y 좌표 계산
    const startY = boxY + (boxHeight / 2) - (totalTextHeight / 2) + (lineHeight / 2) - (finalFontSize * 0.1);

    const textElements = lines.map((line, index) => {
        // dy는 두 번째 줄부터 적용
        const dy = index === 0 ? 0 : lineHeight;
        // 첫 번째 tspan은 y 속성으로 위치를 잡고, 나머지는 dy로 간격을 조정합니다.
        const yAttr = index === 0 ? `y="${startY}"` : '';
        return `<tspan x="${textPaddingX}" dy="${dy}">${line.trim()}</tspan>`;
    }).join('');
    
    // --- 개선된 로직 끝 ---

    const svg = `<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg">
            <style>
                .title { font-family: Arial, sans-serif; font-size: ${finalFontSize}px; fill: ${textColor || '#FFFFFF'}; text-anchor: start; }
            </style>
            <image href="${imageDataUri}" x="0" y="0" width="100%" height="100%"/>
            <rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor || 'rgba(0,0,0,0.5)'}" />
            <text class="title" x="${textPaddingX}" ${lines.length > 1 ? 'y="' + startY + '"' : 'y="' + (boxY + boxHeight / 2) + '" dominant-baseline="middle"'}>
                ${lines.length > 1 ? textElements : (text || '')}
            </text>
        </svg>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
      body: svg.trim().replace(/\s+/g, ' '),
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
