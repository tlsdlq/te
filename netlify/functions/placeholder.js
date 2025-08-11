// /netlify/functions/svg-generator.js
const sharp = require('sharp');

exports.handler = async function(event, context) {
  const { w, h, text = '', bgImg, bgColor, textColor, fontSize } = event.queryStringParameters;

  let finalWidth, finalHeight, backgroundContent = '', errorText = '';
  
  const siteUrl = process.env.URL || 'YOUR_NETLIFY_SITE_URL';

  if (bgImg) {
    // --- ✨ 여기가 핵심! ✨ ---
    // 이미지를 처리해서 Base64로 만드는 대신, image-proxy의 URL을 생성합니다.
    // 이 URL 자체가 이미지의 주소가 됩니다.
    const imageUrl = `${siteUrl}/.netlify/functions/image-proxy?url=${encodeURIComponent(bgImg)}`;

    // SVG의 <image> 태그에 Base64 데이터가 아닌, 위에서 만든 URL을 직접 연결합니다.
    backgroundContent = `<image href="${imageUrl}" x="0" y="0" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"/>`;
    // ----------------------------------------------------
    
    // 너비와 높이 결정 로직은 그대로 필요할 수 있습니다.
    // 만약 w, h 파라미터가 없다면, sharp로 메타데이터만 빠르게 읽어올 수 있습니다.
    if (w && h) {
      finalWidth = parseInt(w, 10);
      finalHeight = parseInt(h, 10);
    } else {
      // 이 부분은 최초 다운로드 비용을 감수하고 정확한 크기를 얻고 싶을 때만 사용합니다.
      // 대부분의 경우 w,h를 지정하는 것이 더 효율적입니다.
      // 여기서는 w, h가 없으면 기본 크기를 사용하도록 단순화하겠습니다.
      finalWidth = 600; 
      finalHeight = 400;
      // try-catch로 메타데이터만 읽어오는 로직을 추가할 수도 있습니다.
    }

  } else {
    // 배경 이미지가 없을 때의 로직
    finalWidth = parseInt(w || '300', 10); 
    finalHeight = parseInt(h || '150', 10);
    backgroundContent = `<rect width="100%" height="100%" fill="#cccccc" />`;
  }
  
  // SVG 생성 로직
  // (finalWidth, finalHeight가 결정된 후의 로직은 이전과 거의 동일합니다)
  const boxHeight = finalHeight * 0.25;
  const boxY = finalHeight - boxHeight;
  const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
  const textPaddingX = finalWidth * 0.03;
  const textY = boxY + (boxHeight / 2);
  const svg = `<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg">${backgroundContent}${text || errorText ? `<rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor || 'rgba(0,0,0,0.5)'}" /><text x="${textPaddingX}" y="${textY}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor || '#FFFFFF'}" text-anchor="start" dominant-baseline="middle">${errorText || text}</text>` : ''}</svg>`;

  return {
    statusCode: 200,
    headers: { 
      'Content-Type': 'image/svg+xml',
      // 이 SVG 자체는 캐시되면 안 됩니다. (텍스트가 계속 바뀌므로)
      // 또는 짧게 캐시합니다.
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
    body: svg,
  };
};
