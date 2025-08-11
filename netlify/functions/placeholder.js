const sharp = require('sharp');

exports.handler = async function(event, context) {
  const { w, h, text = '', bgImg, bgColor, textColor, fontSize } = event.queryStringParameters;

  let finalWidth, finalHeight, backgroundContent = '', errorText = '';

  if (bgImg) {
    try {
      const imageResponse = await fetch(bgImg);
      if (!imageResponse.ok) throw new Error(`Fetch failed: ${imageResponse.status}`);
      
      const imageBuffer = await imageResponse.arrayBuffer();

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
        .resize({ width: finalWidth, height: finalHeight, fit: 'cover' }) // 크기 조절
        .webp({ quality: 80 }) // 가벼운 WebP 포맷으로, 품질 80%로 압축
        .toBuffer();

      const imageBase64 = optimizedBuffer.toString('base64');
      const imageMimeType = 'image/webp'; // 포맷을 webp로 고정

      backgroundContent = `<image href="data:${imageMimeType};base64,${imageBase64}" x="0" y="0" width="${finalWidth}" height="${finalHeight}" preserveAspectRatio="xMidYMid slice"/>`;

    } catch (err) {
      finalWidth = 600; finalHeight = 400; errorText = 'Image Load/Optimize Error!';
      backgroundContent = `<rect width="100%" height="100%" fill="#ccc" />`;
      console.error(err);
    }
  } else {
    finalWidth = parseInt(w || '300', 10); finalHeight = parseInt(h || '150', 10);
    backgroundContent = `<rect width="100%" height="100%" fill="#cccccc" />`;
  }
  
  const boxHeight = finalHeight * 0.25;
  const boxY = finalHeight - boxHeight;
  const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
  const textPaddingX = finalWidth * 0.03;
  const textY = boxY + (boxHeight / 2);
  const svg = `<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg">${backgroundContent}${text || errorText ? `<rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor || 'rgba(0,0,0,0.5)'}" /><text x="${textPaddingX}" y="${textY}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor || '#FFFFFF'}" text-anchor="start" dominant-baseline="middle">${errorText || text}</text>` : ''}</svg>`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600' },
    body: svg,
  };
};
