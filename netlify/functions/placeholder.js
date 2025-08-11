const imageSize = require('image-size');

exports.handler = async function(event, context) {
  // 1. URL 파라미터 읽기
  const {
    w, h, text = '', bgImg,
    bgColor = 'rgba(0, 0, 0, 0.5)',
    textColor = '#FFFFFF',
    fontSize,
  } = event.queryStringParameters;

  let finalWidth;
  let finalHeight;
  let backgroundContent = '';
  let errorText = '';

  // 2. 배경 및 최종 크기 결정
  if (bgImg) {
    try {
      const imageResponse = await fetch(bgImg);
      if (!imageResponse.ok) throw new Error(`Image fetch failed: ${imageResponse.status}`);
      
      const imageAsBuffer = Buffer.from(await imageResponse.arrayBuffer());

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
      errorText = 'Image Load/Size Error!';
      backgroundContent = `<rect width="100%" height="100%" fill="#ccc" />`;
      console.error(err);
    }
  } else {
    finalWidth = parseInt(w || '300', 10);
    finalHeight = parseInt(h || '150', 10);
    backgroundContent = `<rect width="100%" height="100%" fill="#cccccc" />`;
  }
  
  // --- ✨ 여기가 핵심! 모든 것을 비율에 맞게 자동 조절 ✨ ---

  // 대사 박스 높이를 전체 높이의 25%로 설정
  const boxHeight = finalHeight * 0.25;
  // 대사 박스 Y 위치를 계산 (이미지 하단에 붙도록)
  const boxY = finalHeight - boxHeight;

  // 글자 크기를 이미지 너비에 비례하게 설정 (사용자 지정 값이 없으면)
  const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
  
  // 텍스트 좌측 여백(padding)을 이미지 너비에 비례하게 설정
  const textPaddingX = finalWidth * 0.03;

  // 텍스트 Y 위치를 대사 박스의 세로 중앙으로 정확히 계산
  const textY = boxY + (boxHeight / 2);

  // ----------------------------------------------------

  const svg = `
    <svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg">
      ${backgroundContent}
      
      <!-- 텍스트나 에러 메시지가 있을 경우에만 대사 박스를 그립니다 -->
      ${text || errorText ? `
        <rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor}" />
        <text
          x="${textPaddingX}"
          y="${textY}"
          font-family="Arial, sans-serif"
          font-size="${finalFontSize}"
          fill="${textColor}"
          text-anchor="start"
          dominant-baseline="middle"
        >
          ${errorText || text}
        </text>
      ` : ''}
    </svg>
  `;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache' },
    body: svg,
  };
};
