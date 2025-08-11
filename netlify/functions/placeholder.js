exports.handler = async function(event) {
  const { w, h, text = '', bgImg, bgColor, textColor, fontSize } = event.queryStringParameters;

  let backgroundContent = '';
  let errorText = '';
  let finalWidth = parseInt(w || '600', 10);
  let finalHeight = parseInt(h || '400', 10);

  if (bgImg) {
    try {
      // ✨ --- 여기가 핵심 변경 사항입니다 --- ✨
      // 1. 직접 이미지를 처리하는 대신, 최적화된 배경 이미지를 생성/캐시하는 함수를 호출합니다.
      const siteUrl = process.env.URL || 'https://cool-dusk-cb5c8e.netlify.app';
      // URL 생성 시 text와 같은 가변 파라미터는 제외합니다.
      const bgUrl = `${siteUrl}/.netlify/functions/optimized-bg?bgImg=${encodeURIComponent(bgImg)}${w ? '&w='+w : ''}${h ? '&h='+h : ''}`;

      const imageResponse = await fetch(bgUrl);
      if (!imageResponse.ok) {
        throw new Error(`Optimized BG fetch failed: ${imageResponse.status}`);
      }
      
      // `optimized-bg` 함수가 반환한 WebP 이미지 데이터를 Base64로 인코딩합니다.
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      
      // 원본 이미지의 크기를 알 수 없으므로, 파라미터가 없으면 기본값을 사용해야 합니다.
      // (필요하다면 optimized-bg가 헤더에 크기 정보를 담아 전달하는 방법도 가능합니다)

      // 2. 이미지를 Base64 데이터로 SVG 안에 직접 내장합니다.
      backgroundContent = `<image href="data:image/webp;base64,${imageBase64}" x="0" y="0" width="${finalWidth}" height="${finalHeight}" preserveAspectRatio="xMidYMid slice"/>`;
      // ✨ --- 여기까지가 핵심 변경 사항입니다 --- ✨

    } catch (err) {
      errorText = 'Image Load Error!';
      backgroundContent = `<rect width="100%" height="100%" fill="#ccc" />`;
      console.error(err);
    }
  } else {
    backgroundContent = `<rect width="100%" height="100%" fill="#cccccc" />`;
  }
  
  // 3. SVG를 생성합니다.
  const boxHeight = finalHeight * 0.25;
  const boxY = finalHeight - boxHeight;
  const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
  const textPaddingX = finalWidth * 0.03;
  const textY = boxY + (boxHeight / 2);
  const svg = `<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${backgroundContent}${text || errorText ? `<rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor || 'rgba(0,0,0,0.5)'}" /><text x="${textPaddingX}" y="${textY}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor || '#FFFFFF'}" text-anchor="start" dominant-baseline="middle">${errorText || text}</text>` : ''}</svg>`;

  // 4. 최종 SVG도 캐시합니다. (URL이 다르므로 text 별로 캐시됨)
  return {
    statusCode: 200,
    headers: { 
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
    },
    body: svg,
  };
};
