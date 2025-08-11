// /netlify/functions/svg-generator.js
// sharp 라이브러리를 사용하지 않으므로 require 문을 제거합니다.

exports.handler = async function(event, context) {
  const { w, h, text = '', bgImg, bgColor, textColor, fontSize } = event.queryStringParameters;

  // w, h 파라미터가 없으면 SVG의 기본 크기를 지정합니다.
  const finalWidth = parseInt(w || '600', 10);
  const finalHeight = parseInt(h || '400', 10);
  
  let backgroundContent = '';
  let errorText = '';

  if (bgImg) {
    // --- ✨ 여기가 최종 해결책! ✨ ---
    // 어떤 파라미터가 들어오든, image-proxy로 넘기는 URL은 오직 'url' 파라미터 하나만 포함하도록 고정합니다.
    // 이렇게 하면 동일한 bgImg에 대해서는 항상 100% 동일한 캐시 키가 생성됩니다.
    const siteUrl = process.env.URL || 'YOUR_NETLIFY_SITE_URL'; 
    const canonicalProxyUrl = `${siteUrl}/.netlify/functions/image-proxy?url=${encodeURIComponent(bgImg)}`;

    // SVG의 <image> 태그에 정규화된 프록시 URL을 연결합니다.
    backgroundContent = `<image href="${canonicalProxyUrl}" x="0" y="0" width="${finalWidth}" height="${finalHeight}" preserveAspectRatio="xMidYMid slice"/>`;
    // ----------------------------------------------------

  } else {
    // 배경 이미지가 없을 때
    backgroundContent = `<rect width="100%" height="100%" fill="#cccccc" />`;
  }
  
  // SVG 생성 로직 (이전과 동일)
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
      // 생성되는 SVG는 텍스트가 바뀔 수 있으므로 캐시하지 않거나 매우 짧게 캐시합니다.
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
    body: svg,
  };
};
