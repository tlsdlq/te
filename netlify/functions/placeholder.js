const imageSize = require('image-size');

exports.handler = async function(event, context) {
  const {
    w, // 기본값 제거
    h, // 기본값 제거
    text = '',
    bgImg,
    bgColor = 'rgba(0, 0, 0, 0.5)',
    textColor = '#FFFFFF',
    fontSize,
  } = event.queryStringParameters;

  let finalWidth = w ? parseInt(w, 10) : 600; // w가 없으면 일단 기본값
  let finalHeight = h ? parseInt(h, 10) : 400; // h가 없으면 일단 기본값
  
  let backgroundContent = '';

  if (bgImg) {
    try {
      const imageResponse = await fetch(bgImg);
      if (!imageResponse.ok) throw new Error('Image fetch failed');
      
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageAsBuffer = Buffer.from(imageBuffer); // Buffer.from으로 한번만 변환

      // --- ✨ 여기가 핵심! 이미지 크기 자동 감지 ✨ ---
      // w나 h 파라미터가 URL에 없을 경우에만 크기를 감지합니다.
      if (!w || !h) {
        const dimensions = imageSize(imageAsBuffer);
        finalWidth = w ? parseInt(w, 10) : dimensions.width;
        finalHeight = h ? parseInt(h, 10) : dimensions.height;
      }
      // ---------------------------------------------

      const imageBase64 = imageAsBuffer.toString('base64');
      const imageMimeType = imageResponse.headers.get('content-type');

      backgroundContent = `
        <image href="data:${imageMimeType};base64,${imageBase64}" x="0" y="0" width="${finalWidth}" height="${finalHeight}" preserveAspectRatio="xMidYMid slice"/>
      `;
    } catch (error) {
      console.error(error);
      backgroundContent = `<rect width="100%" height="100%" fill="#ccc" /><text x="50%" y="50%" fill="black">Image Load Error</text>`;
    }
  } else {
    // bgImg가 없을 때도 w,h가 없으면 기본값을 사용
    finalWidth = parseInt(w || '300', 10);
    finalHeight = parseInt(h || '150', 10);
    backgroundContent = `<rect width="100%" height="100%" fill="#cccccc" />`;
  }
  
  const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 20);

  const svg = `
    <svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg">
      ${backgroundContent}
      ${text ? `
        <rect x="0" y="${finalHeight * 0.7}" width="100%" height="${finalHeight * 0.3}" fill="${bgColor}" />
        <text x="30" y="${finalHeight * 0.7 + (finalHeight * 0.3 / 2)}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor}" text-anchor="start" dominant-baseline="middle">
          ${text}
        </text>
      ` : ''}
    </svg>
  `;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600, immutable' },
    body: svg,
  };
};
