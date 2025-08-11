exports.handler = async function(event) {
  // w, h 파라미터는 이제 사용하지 않습니다.
  const { text = '', bgImg, bgColor, textColor, fontSize } = event.queryStringParameters;

  let backgroundContent = '';
  let errorText = '';
  // 너비와 높이는 아래에서 동적으로 결정됩니다.
  let finalWidth, finalHeight; 

  if (bgImg) {
    try {
      const siteUrl = process.env.URL || 'https://cool-dusk-cb5c8e.netlify.app';
      // URL이 매우 간단해졌습니다.
      const bgUrl = `${siteUrl}/.netlify/functions/optimized-bg?bgImg=${encodeURIComponent(bgImg)}`;

      const imageResponse = await fetch(bgUrl);
      if (!imageResponse.ok) throw new Error(`Optimized BG fetch failed: ${imageResponse.status}`);
      
      // ✨ --- 여기가 핵심입니다 --- ✨
      // 1. 헤더에서 너비와 높이를 읽어와 변수에 할당합니다.
      finalWidth = parseInt(imageResponse.headers.get('x-image-width'), 10);
      finalHeight = parseInt(imageResponse.headers.get('x-image-height'), 10);
      
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      
      backgroundContent = `<image href="data:image/webp;base64,${imageBase64}" x="0" y="0" width="${finalWidth}" height="${finalHeight}"/>`;

    } catch (err) {
      // 에러 발생 시 고정된 크기의 오류 이미지를 보여줍니다.
      finalWidth = 600;
      finalHeight = 400;
      errorText = 'Image Load Error!';
      backgroundContent = `<rect width="100%" height="100%" fill="#ccc" />`;
      console.error(err);
    }
  } else {
    // bgImg 파라미터가 아예 없는 경우
    finalWidth = 600;
    finalHeight = 400;
    backgroundContent = `<rect width="100%" height="100%" fill="#cccccc" />`;
  }
  
  // 이제 finalWidth와 finalHeight는 항상 값이 있으므로 자신있게 사용합니다.
  const boxHeight = finalHeight * 0.25;
  const boxY = finalHeight - boxHeight;
  const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
  const textPaddingX = finalWidth * 0.03;
  const textY = boxY + (boxHeight / 2);
  const svg = `<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${backgroundContent}${text || errorText ? `<rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor || 'rgba(0,0,0,0.5)'}" /><text x="${textPaddingX}" y="${textY}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor || '#FFFFFF'}" text-anchor="start" dominant-baseline="middle">${errorText || text}</text>` : ''}</svg>`;

  return {
    statusCode: 200,
    headers: { 
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
    },
    body: svg,
  };
};
