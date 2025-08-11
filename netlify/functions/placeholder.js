exports.handler = async function(event) {
  const { bgImg, text = '', w, h, bgColor, textColor, fontSize } = event.queryStringParameters;

  // 이 함수는 이제 이미지 처리 자체를 하지 않으므로 매우 가벼워집니다.
  // 따라서 원본 이미지 크기를 알기 위한 로직도 필요 없습니다.
  // 너비와 높이는 파라미터로 전달된 값을 그대로 사용합니다.
  const finalWidth = parseInt(w || '600', 10);
  const finalHeight = parseInt(h || '400', 10);

  let backgroundContent = '';

  if (bgImg) {
    // ✨✨✨ 핵심 변경: Base64로 인코딩하는 대신, image-optimizer 함수의 URL을 직접 사용합니다.
    // 이 URL은 CDN에 의해 강력하게 캐싱됩니다.
    const siteUrl = process.env.URL || 'https://cool-dusk-cb5c8e.netlify.app';
    const imageUrl = `${siteUrl}/.netlify/functions/image-optimizer?url=${encodeURIComponent(bgImg)}&w=${finalWidth}&h=${finalHeight}`;
    
    backgroundContent = `<image href="${imageUrl}" x="0" y="0" width="${finalWidth}" height="${finalHeight}" preserveAspectRatio="xMidYMid slice"/>`;
  } else {
    backgroundContent = `<rect width="100%" height="100%" fill="#cccccc" />`;
  }
  
  // SVG 생성 로직 (대부분 동일)
  const boxHeight = finalHeight * 0.25;
  const boxY = finalHeight - boxHeight;
  const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
  const textPaddingX = finalWidth * 0.03;
  const textY = boxY + (boxHeight / 2);
  const svg = `<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${backgroundContent}${text ? `<rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor || 'rgba(0,0,0,0.5)'}" /><text x="${textPaddingX}" y="${textY}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor || '#FFFFFF'}" text-anchor="start" dominant-baseline="middle">${text}</text>` : ''}</svg>`;

  return {
    statusCode: 200,
    headers: { 
      'Content-Type': 'image/svg+xml',
      // ✨✨✨ 핵심: 이 SVG는 동적 텍스트를 포함하므로 캐싱하지 않습니다!
      // 이렇게 해야 text 파라미터가 바뀔 때마다 항상 최신 내용이 보입니다.
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
    body: svg,
  };
};
