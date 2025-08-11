// /netlify/functions/placeholder.js
exports.handler = async function(event) {
  const { bgImg, text = '', w, h, bgColor, textColor, fontSize } = event.queryStringParameters;

  const finalWidth = parseInt(w || '600', 10);
  const finalHeight = parseInt(h || '400', 10);

  let backgroundContent = '';

  if (bgImg) {
    const siteUrl = process.env.URL || 'https://cool-dusk-cb5c8e.netlify.app';
    const imageUrl = `${siteUrl}/.netlify/functions/image-optimizer?url=${encodeURIComponent(bgImg)}&w=${finalWidth}&h=${finalHeight}`;
    
    // --- ✨✨✨ 여기가 수정된 부분입니다 ✨✨✨ ---
    // 'href'를 'xlink:href'로 변경했습니다.
    backgroundContent = `<image xlink:href="${imageUrl}" x="0" y="0" width="${finalWidth}" height="${finalHeight}" preserveAspectRatio="xMidYMid slice"/>`;

  } else {
    backgroundContent = `<rect width="100%" height="100%" fill="#cccccc" />`;
  }
  
  // 나머지 SVG 생성 로직은 동일합니다.
  const boxHeight = finalHeight * 0.25;
  const boxY = finalHeight - boxHeight;
  const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
  const textPaddingX = finalWidth * 0.03;
  const textY = boxY + (boxHeight / 2);

  // SVG 루트 태그에 xmlns:xlink가 선언되어 있는지 확인합니다.
  const svg = `<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${backgroundContent}${text ? `<rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor || 'rgba(0,0,0,0.5)'}" /><text x="${textPaddingX}" y="${textY}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor || '#FFFFFF'}" text-anchor="start" dominant-baseline="middle">${text}</text>` : ''}</svg>`;

  return {
    statusCode: 200,
    headers: { 
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
    body: svg,
  };
};
