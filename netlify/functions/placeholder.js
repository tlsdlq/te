// /netlify/functions/placeholder.js

// On-Demand Builder를 import합니다.
const { builder } = require('@netlify/functions');
const fetch = require('node-fetch');

// 기존 핸들러 로직을 builder로 감쌉니다.
exports.handler = builder(async function(event) {
  const { text = '', bgImg, bgColor, textColor, fontSize } = event.queryStringParameters;

  let backgroundContent = '';
  let errorText = '';
  let finalWidth, finalHeight; 

  if (bgImg) {
    try {
      // ⭐ [성능 개선] 더 안정적인 DEPLOY_PRIME_URL을 우선 사용합니다.
      const siteUrl = process.env.DEPLOY_PRIME_URL || process.env.URL || 'https://your-site-url.netlify.app';
      
      // ⭐ [성능 개선] proxy를 거치지 않고 최적화 함수를 바로 호출합니다.
      const bgUrl = `${siteUrl}/.netlify/functions/optimized-bg?bgImg=${encodeURIComponent(bgImg)}`;

      const imageResponse = await fetch(bgUrl);
      if (!imageResponse.ok) {
        throw new Error(`Optimized BG fetch failed with status: ${imageResponse.status}`);
      }
      
      // 헤더에서 최적화된 이미지의 최종 크기를 읽어옵니다.
      finalWidth = parseInt(imageResponse.headers.get('x-image-width'), 10);
      finalHeight = parseInt(imageResponse.headers.get('x-image-height'), 10);
      
      // Base64로 인코딩된 이미지 데이터를 받습니다.
      const imageBase64 = await imageResponse.text();
      
      backgroundContent = `<image href="data:image/webp;base64,${imageBase64}" x="0" y="0" width="${finalWidth}" height="${finalHeight}"/>`;

    } catch (err) {
      finalWidth = 1200; // 기본 너비를 1200으로 설정
      finalHeight = 630; // 기본 높이를 630 (1.91:1 비율)으로 설정
      errorText = 'Image Load Error!';
      backgroundContent = `<rect width="100%" height="100%" fill="#ccc" />`;
      console.error(err);
    }
  } else {
    finalWidth = 1200;
    finalHeight = 630;
    backgroundContent = `<rect width="100%" height="100%" fill="#cccccc" />`;
  }
  
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
        // ⭐ [핵심 변경] 최종 SVG에도 강력한 캐시 헤더를 추가하여 불필요한 함수 실행을 방지합니다.
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable'
    },
    body: svg,
  };
});
