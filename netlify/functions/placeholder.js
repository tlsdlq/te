// /netlify/functions/placeholder.js
const sharp = require('sharp');

exports.handler = async function(event, context) {
  // 1. 쿼리 파라미터를 일단 받습니다.
  const { w, h, text = '', bgImg, bgColor, textColor, fontSize } = event.queryStringParameters;

  let finalWidth, finalHeight; // 최종 너비와 높이를 담을 변수를 선언합니다.
  let backgroundContent = '';
  let errorText = '';

  if (bgImg) {
    try {
      const siteUrl = process.env.URL || 'https://cool-dusk-cb5c8e.netlify.app';
      const proxyUrl = `${siteUrl}/.netlify/functions/image-proxy?url=${encodeURIComponent(bgImg)}`;

      const imageResponse = await fetch(proxyUrl);
      if (!imageResponse.ok) {
        throw new Error(`Fetch via proxy failed: ${imageResponse.status}`);
      }
      
      const imageBuffer = await imageResponse.arrayBuffer();
      const sharpInstance = sharp(Buffer.from(imageBuffer));

      // --- ✨✨✨ 핵심 변경 사항 시작 ✨✨✨ ---

      // 2. 원본 이미지의 메타데이터(너비/높이 포함)를 읽어옵니다.
      const metadata = await sharpInstance.metadata();

      // 3. w, h 파라미터가 없으면 원본 이미지 크기를, 있으면 파라미터 값을 최종 크기로 사용합니다.
      //    이렇게 하면 기존의 크기 지정 기능도 유지할 수 있습니다.
      finalWidth = parseInt(w || metadata.width, 10);
      finalHeight = parseInt(h || metadata.height, 10);

      let sharpProcessor = sharpInstance;

      // 4. w 또는 h 파라미터가 명시적으로 있을 경우에만 리사이즈를 적용합니다.
      //    파라미터가 없으면 원본 크기 그대로 사용하므로 리사이즈 과정이 필요 없습니다.
      if (w || h) {
          sharpProcessor = sharpProcessor.resize({
              width: finalWidth,
              height: finalHeight,
              fit: 'cover'
          });
      }

      // 이미지를 최적화하고 Base64로 변환합니다.
      const optimizedBuffer = await sharpProcessor
        .webp({ quality: 80 })
        .toBuffer();
      
      // --- ✨✨✨ 핵심 변경 사항 끝 ✨✨✨ ---

      const imageBase64 = optimizedBuffer.toString('base64');
      
      // 5. 최종 결정된 너비와 높이로 SVG를 구성합니다.
      backgroundContent = `<image href="data:image/webp;base64,${imageBase64}" x="0" y="0" width="${finalWidth}" height="${finalHeight}" preserveAspectRatio="xMidYMid slice"/>`;

    } catch (err) {
      errorText = 'Image Load Error!';
      // 에러 발생 시에는 파라미터나 기본값으로 크기를 설정합니다.
      finalWidth = parseInt(w || '600', 10);
      finalHeight = parseInt(h || '400', 10);
      backgroundContent = `<rect width="100%" height="100%" fill="#ccc" />`;
      console.error(err);
    }
  } else {
    // bgImg가 없을 경우에도 파라미터나 기본값으로 크기를 설정합니다.
    finalWidth = parseInt(w || '600', 10);
    finalHeight = parseInt(h || '400', 10);
    backgroundContent = `<rect width="100%" height="100%" fill="#cccccc" />`;
  }
  
  // SVG 생성 로직 (이 부분은 finalWidth, finalHeight를 사용하므로 수정할 필요가 없습니다)
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
