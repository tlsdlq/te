// /netlify/functions/placeholder.js
const sharp = require('sharp');

exports.handler = async function(event, context) {
  // w, h 파라미터는 이제 SVG 크기 결정에 사용하지 않습니다.
  const { text = '', bgImg, bgColor, textColor, fontSize } = event.queryStringParameters;

  let finalWidth, finalHeight;
  let backgroundContent = '';
  let errorText = '';

  if (bgImg) {
    try {
      // 1. image-proxy를 통해 원본 이미지 데이터를 가져옵니다.
      const siteUrl = process.env.URL || 'https://cool-dusk-cb5c8e.netlify.app';
      const proxyUrl = `${siteUrl}/.netlify/functions/image-proxy?url=${encodeURIComponent(bgImg)}`;

      const imageResponse = await fetch(proxyUrl);
      if (!imageResponse.ok) {
        throw new Error(`Fetch via proxy failed: ${imageResponse.status}`);
      }
      
      const imageBuffer = await imageResponse.arrayBuffer();
      const image = sharp(Buffer.from(imageBuffer));

      // --- ✨ ✨ ✨ 여기가 핵심 수정점 ✨ ✨ ✨ ---
      // 2. sharp의 metadata() 기능을 이용해 원본 이미지의 크기를 읽어옵니다.
      const metadata = await image.metadata();
      finalWidth = metadata.width;
      finalHeight = metadata.height;

      // 3. 이미지를 Base64로 변환하되, 크기는 변경하지 않습니다. (.resize() 제거)
      //    단, 용량 최적화를 위해 WebP 포맷 변환은 유지합니다.
      const optimizedBuffer = await image
        .webp({ quality: 80 })
        .toBuffer();
      // ----------------------------------------------------

      const imageBase64 = optimizedBuffer.toString('base64');
      backgroundContent = `<image href="data:image/webp;base64,${imageBase64}" x="0" y="0" width="${finalWidth}" height="${finalHeight}" />`;

    } catch (err) {
      // 에러 발생 시에는 기본 크기를 사용합니다.
      finalWidth = 600;
      finalHeight = 400;
      errorText = 'Image Load Error!';
      backgroundContent = `<rect width="100%" height="100%" fill="#ccc" />`;
      console.error(err);
    }
  } else {
    // 배경 이미지가 없을 때의 기본 크기
    finalWidth = 300;
    finalHeight = 150;
    backgroundContent = `<rect width="100%" height="100%" fill="#cccccc" />`;
  }
  
  // 4. 읽어온 원본 크기를 기반으로 SVG와 텍스트 박스를 생성합니다.
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
      // 생성된 SVG 자체를 CDN에 1년간 저장합니다.
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
    },
    body: svg,
  };
};
