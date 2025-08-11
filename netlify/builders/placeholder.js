// /netlify/builders/placeholder.js

exports.handler = async function(event) {
  const { text = '', bgImg, bgColor, textColor, fontSize } = event.queryStringParameters;

  let backgroundContent = '';
  let errorText = '';
  let finalWidth, finalHeight; 

  if (bgImg) {
    try {
      const siteUrl = process.env.URL || 'https://cool-dusk-cb5c8e.netlify.app';
      // ✨ builders 경로를 호출하도록 수정되었습니다.
      const bgUrl = `${siteUrl}/.netlify/builders/optimized-bg?bgImg=${encodeURIComponent(bgImg)}`;

      const imageResponse = await fetch(bgUrl);
      if (!imageResponse.ok) throw new Error(`Optimized BG builder fetch failed: ${imageResponse.status}`);
      
      // 헤더에서 너비와 높이를 읽어와 SVG 크기를 결정합니다.
      finalWidth = parseInt(imageResponse.headers.get('x-image-width'), 10);
      finalHeight = parseInt(imageResponse.headers.get('x-image-height'), 10);
      
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      
      backgroundContent = `<image href="data:image/webp;base64,${imageBase64}" x="0" y="0" width="${finalWidth}" height="${finalHeight}"/>`;

    } catch (err) {
      finalWidth = 600;
      finalHeight = 400;
      errorText = 'Image Load Error!';
      backgroundContent = `<rect width="100%" height="100%" fill="#ccc" />`;
      console.error(err);
    }
  } else {
    finalWidth = 600;
    finalHeight = 400;
    backgroundContent = `<rect width="100%" height="100%" fill="#cccccc" />`;
  }
  
  const boxHeight = finalHeight * 0.25;
  const boxY = finalHeight - boxHeight;
  const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
  const textPaddingX = finalWidth * 0.03;
  const textY = boxY + (boxHeight / 2);
  const svg = `<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${backgroundContent}${text || errorText ? `<rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor || 'rgba(0,0,0,0.5)'}" /><text x="${textPaddingX}" y="${textY}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor || '#FFFFFF'}" text-anchor="start" dominant-baseline="middle">${errorText || text}</text>` : ''}</svg>`;

  // 이 빌더의 결과물(SVG)도 영구 저장됩니다.
  return {
    statusCode: 200,
    headers: { 
      'Content-Type': 'image/svg+xml',
    },
    body: svg,
  };
};
