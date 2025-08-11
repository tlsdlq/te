// /netlify/functions/placeholder.js
const sharp = require('sharp');

exports.handler = async function(event, context) {
  const { w, h, text = '', bgImg, bgColor, textColor, fontSize } = event.queryStringParameters;

  // w, h 파라미터가 없으면 SVG의 기본 크기를 지정합니다.
  const finalWidth = parseInt(w || '600', 10);
  const finalHeight = parseInt(h || '400', 10);

  let backgroundContent = '';
  let errorText = '';

  if (bgImg) {
    try {
      // 1. image-proxy를 호출하여 원본 이미지 데이터를 가져옵니다. (이 부분은 캐시가 잘 작동합니다)
      const siteUrl = process.env.URL || 'https://cool-dusk-cb5c8e.netlify.app';
      const proxyUrl = `${siteUrl}/.netlify/functions/image-proxy?url=${encodeURIComponent(bgImg)}`;

      const imageResponse = await fetch(proxyUrl);
      if (!imageResponse.ok) {
        throw new Error(`Fetch via proxy failed: ${imageResponse.status}`);
      }
      
      const imageBuffer = await imageResponse.arrayBuffer();

      // 2. sharp를 이용해 이미지를 최적화하고 Base64로 변환합니다.
      const optimizedBuffer = await sharp(Buffer.from(imageBuffer))
        .resize({ width: finalWidth, height: finalHeight, fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer();

      const imageBase64 = optimizedBuffer.toString('base64');

      // 3. 이미지를 Base64 데이터로 SVG 안에 직접 내장(Embed)합니다.
      backgroundContent = `<image href="data:image/webp;base64,${imageBase64}" x="0" y="0" width="${finalWidth}" height="${finalHeight}" preserveAspectRatio="xMidYMid slice"/>`;

    } catch (err) {
      errorText = 'Image Load Error!';
      backgroundContent = `<rect width="100%" height="100%" fill="#ccc" />`;
      console.error(err);
    }
  } else {
    backgroundContent = `<rect width="100%" height="100%" fill="#cccccc" />`;
  }
  
  // 4. SVG를 생성합니다.
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
      // --- ✨ ✨ ✨ 이게 진짜 핵심입니다 ✨ ✨ ✨ ---
      // 생성된 이 SVG 자체를 CDN과 브라우저에 1년간 저장하도록 지시합니다.
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
    },
    body: svg,
  };
};
