const imageSize = require('image-size');

exports.handler = async function(event, context) {
  // 1. URL 파라미터 읽기
  const {
    w, h, text = '', bgImg,
    bgColor = 'rgba(0, 0, 0, 0.5)',
    textColor = '#FFFFFF',
    fontSize,
  } = event.queryStringParameters;

  let finalWidth, finalHeight;
  let backgroundContent = '';
  let errorText = '';

  // 2. 배경 및 최종 크기 결정
  if (bgImg) {
    try {
      const imageResponse = await fetch(bgImg);
      if (!imageResponse.ok) throw new Error(`Image fetch failed: ${imageResponse.status}`);
      
      const imageAsBuffer = Buffer.from(await imageResponse.arrayBuffer());

      // w, h 파라미터가 없으면 이미지 크기를 자동 감지, 있으면 그 값을 사용
      if (w && h) {
        finalWidth = parseInt(w, 10);
        finalHeight = parseInt(h, 10);
      } else {
        const dimensions = imageSize(imageAsBuffer);
        finalWidth = dimensions.width;
        finalHeight = dimensions.height;
      }

      const imageBase64 = imageAsBuffer.toString('base64');
      const imageMimeType = imageResponse.headers.get('content-type') || 'image/png';
      backgroundContent = `<image href="data:${imageMimeType};base64,${imageBase64}" x="0" y="0" width="${finalWidth}" height="${finalHeight}" preserveAspectRatio="xMidYMid slice"/>`;

    } catch (err) {
      finalWidth = 600;
      finalHeight = 400;
      errorText = 'Image Load or Size Error!';
      backgroundContent = `<rect width="100%" height="100%" fill="#ccc" />`;
      console.error(err);
    }
  } else {
    // 배경 이미지가 없으면 w, h 또는 기본값을 사용
    finalWidth = parseInt(w || '300', 10);
    finalHeight = parseInt(h || '150', 10);
    backgroundContent = `<rect width="100%" height="100%" fill="#cccccc" />`;
  }
  
  // 3. 텍스트 및 박스 크기를 최종 크기에 비례하게 자동 조절
  const boxHeight = finalHeight * 0.25;
  const boxY = finalHeight - boxHeight;
  const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
  const textPaddingX = finalWidth * 0.03;
  const textY = boxY + (boxHeight / 2);

  // 4. 최종 SVG 코드 생성
  const svg = `
    <svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg">
      ${backgroundContent}
      ${text || errorText ? `
        <rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor}" />
        <text x="${textPaddingX}" y="${textY}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor}" text-anchor="start" dominant-baseline="middle">
          ${errorText || text}
        </text>
      ` : ''}
    </svg>
  `;

  // 5. 결과 반환 (테스트를 위해 캐시 비활성화)
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache' },
    body: svg,
  };
};
