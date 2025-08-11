// /netlify/functions/svg-generator.js
const sharp = require('sharp');

// ⚠️ 중요: 이 함수 파일 이름을 원래 사용하시던 이름으로 맞춰주세요.
// 예: 원래 파일 이름이 `index.js`였다면 `svg-generator.js`를 `index.js`로 변경
exports.handler = async function(event, context) {
  const { w, h, text = '', bgImg, bgColor, textColor, fontSize } = event.queryStringParameters;

  let finalWidth, finalHeight, backgroundContent = '', errorText = '';

  if (bgImg) {
    try {
      // --- ✨ 핵심 변경점: 내부 프록시 함수 호출 ✨ ---
      // 외부 이미지 URL을 직접 요청하는 대신, 우리 사이트의 image-proxy 함수를 호출합니다.
      // 이렇게 하면 image-proxy의 강력한 CDN 캐시 정책을 활용할 수 있습니다.
      // ⚠️ 중요: 'YOUR_NETLIFY_SITE_URL'을 실제 Netlify 사이트의 기본 URL로 반드시 변경해주세요.
      // 예: https://my-awesome-site.netlify.app
      const siteUrl = process.env.URL || 'YOUR_NETLIFY_SITE_URL'; 
      const proxyUrl = `${siteUrl}/.netlify/functions/image-proxy?url=${encodeURIComponent(bgImg)}`;

      const imageResponse = await fetch(proxyUrl);
      if (!imageResponse.ok) {
        throw new Error(`Fetch via proxy failed: ${imageResponse.status}. Is the original image URL correct?`);
      }
      
      const imageBuffer = await imageResponse.arrayBuffer();

      // sharp를 이용한 이미지 최적화 로직은 그대로 유지됩니다.
      const image = sharp(Buffer.from(imageBuffer));
      const metadata = await image.metadata();

      if (w && h) {
        finalWidth = parseInt(w, 10);
        finalHeight = parseInt(h, 10);
      } else {
        finalWidth = metadata.width;
        finalHeight = metadata.height;
      }

      const optimizedBuffer = await image
        .resize({ width: finalWidth, height: finalHeight, fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer();

      const imageBase64 = optimizedBuffer.toString('base64');
      const imageMimeType = 'image/webp';

      backgroundContent = `<image href="data:${imageMimeType};base64,${imageBase64}" x="0" y="0" width="${finalWidth}" height="${finalHeight}" preserveAspectRatio="xMidYMid slice"/>`;

    } catch (err) {
      finalWidth = w ? parseInt(w, 10) : 600; 
      finalHeight = h ? parseInt(h, 10) : 400; 
      errorText = 'Image Load Error!';
      backgroundContent = `<rect width="100%" height="100%" fill="#ccc" />`;
      console.error(err);
    }
  } else {
    finalWidth = parseInt(w || '300', 10); 
    finalHeight = parseInt(h || '150', 10);
    backgroundContent = `<rect width="100%" height="100%" fill="#cccccc" />`;
  }
  
  // SVG 생성 로직
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
      // ✨ 캐시 강화: CDN에 1일(86400초)간 캐시하도록 s-maxage 추가
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
    body: svg,
  };
};
