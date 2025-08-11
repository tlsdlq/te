const sizeOf = require('image-size'); // '이미지 크기 측정기' 도구를 가져옵니다.

exports.handler = async function(event, context) {
  const {
    w, // 기본값을 없애서 사용자가 입력했는지 안했는지 구분
    h,
    text = '',
    bgImg,
    bgColor = 'rgba(0, 0, 0, 0.5)',
    textColor = '#FFFFFF',
    fontSize,
  } = event.queryStringParameters;

  let finalWidth = w ? parseInt(w, 10) : null;
  let finalHeight = h ? parseInt(h, 10) : null;
  let backgroundContent = '';

  if (bgImg) {
    try {
      const imageResponse = await fetch(bgImg);
      if (!imageResponse.ok) throw new Error('Image fetch failed');
      
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      const imageMimeType = imageResponse.headers.get('content-type');

      // --- ✨ 자동 크기 감지 로직 시작 ✨ ---
      if (!finalWidth || !finalHeight) {
        // 사용자가 너비나 높이를 지정하지 않았을 때만 실행
        const dimensions = sizeOf(Buffer.from(imageBuffer)); // 크기 측정!
        finalWidth = finalWidth || dimensions.width; // w가 없으면 감지된 너비 사용
        finalHeight = finalHeight || dimensions.height; // h가 없으면 감지된 높이 사용
      }
      // --- ✨ 자동 크기 감지 로직 끝 ✨ ---

      backgroundContent = `<image href="data:${imageMimeType};base64,${imageBase64}" x="0" y="0" width="${finalWidth}" height="${finalHeight}" preserveAspectRatio="xMidYMid slice"/>`;
    } catch (error) {
      finalWidth = finalWidth || 600;
      finalHeight = finalHeight || 400;
      backgroundContent = `<rect width="100%" height="100%" fill="#ccc" /><text x="50%" y="50%" fill="black">Image Load Error</text>`;
    }
  } else {
    // 배경 이미지가 없을 땐 크기 지정이 필수
    finalWidth = finalWidth || 300;
    finalHeight = finalHeight || 150;
    backgroundContent = `<rect width="100%" height="100%" fill="#cccccc" />`;
  }

  const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 20);

  const svg = `
    <svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg">
      ${backgroundContent}
      ${text ? `<rect x="0" y="${finalHeight * 0.7}" width="100%" height="${finalHeight * 0.3}" fill="${bgColor}" /><text x="30" y="${finalHeight * 0.7 + (finalHeight * 0.3 / 2)}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor}" text-anchor="start" dominant-baseline="middle">${text}</text>` : ''}
    </svg>
  `;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600, immutable' },
    body: svg,
  };
};
