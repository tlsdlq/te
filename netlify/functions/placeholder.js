exports.handler = async function(event, context) {
  // 1. URL 파라미터를 읽습니다. (bgImg가 필수!)
  const {
    w, h, text = '', bgImg,
    bgColor = 'rgba(0, 0, 0, 0.5)',
    textColor = '#FFFFFF',
    fontSize,
  } = event.queryStringParameters;

  if (!bgImg) {
    return {
      statusCode: 400,
      body: 'Error: bgImg parameter is required.'
    };
  }
  
  // 2. 최종 이미지 크기를 결정합니다. w,h가 없으면 기본값을 사용합니다.
  const finalWidth = parseInt(w || '800', 10);
  const finalHeight = parseInt(h || '400', 10);

  // --- ✨ 여기가 궁극의 해결책! Netlify 이미지 변환 CDN 사용 ✨ ---
  // /.netlify/images?url=...&w=...&h=...&fit=cover
  // 이 특수 주소는 Netlify가 bgImg를 가져와서, 자동으로 최적화하고,
  // finalWidth와 finalHeight에 맞춰 리사이징한 후, CDN을 통해 제공합니다.
  const optimizedImageUrl = `/.netlify/images?url=${encodeURIComponent(bgImg)}&w=${finalWidth}&h=${finalHeight}&fit=cover`;
  // -----------------------------------------------------------

  // SVG는 이제 외부 이미지를 '링크'하기만 합니다. Base64 인코딩이 없습니다!
  const backgroundContent = `<image href="${optimizedImageUrl}" x="0" y="0" width="100%" height="100%" />`;

  // 3. 텍스트 및 박스 크기 계산 (이전과 동일)
  const boxHeight = finalHeight * 0.25;
  const boxY = finalHeight - boxHeight;
  const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
  const textPaddingX = finalWidth * 0.03;
  const textY = boxY + (boxHeight / 2);

  // 4. 최종 SVG 코드 생성 (매우 가벼움)
  const svg = `
    <svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg">
      ${backgroundContent}
      ${text ? `
        <rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor}" />
        <text x="${textPaddingX}" y="${textY}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor}" text-anchor="start" dominant-baseline="middle">
          ${text}
        </text>
      ` : ''}
    </svg>
  `;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400', // 하루 동안 캐시
    },
    body: svg,
  };
};
