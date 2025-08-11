// sharp를 사용하지 않으므로 require 문을 삭제합니다.

exports.handler = async function(event, context) {
  // 쿼리 파라미터를 파싱하는 부분은 동일합니다.
  const { w, h, text = '', bgImg, bgColor, textColor, fontSize } = event.queryStringParameters;

  let finalWidth, finalHeight, backgroundContent = '';

  // 너비와 높이의 기본값을 설정합니다.
  finalWidth = parseInt(w || '600', 10);
  finalHeight = parseInt(h || '400', 10);

  // 배경 이미지가 지정된 경우
  if (bgImg) {
    // --- ✨ 여기가 핵심! Netlify 이미지 변환 URL 생성 ✨ ---

    // 1. 원본 이미지 URL을 URL 파라미터로 사용하기 위해 인코딩합니다.
    const encodedBgImgUrl = encodeURIComponent(bgImg);
    
    // 2. Netlify의 이미지 변환 API 형식에 맞는 새로운 URL을 만듭니다.
    //    형식: /.netlify/images?url=<인코딩된 URL>&w=<너비>&h=<높이>&fit=cover&q=<품질>
    const netlifyImageUrl = `/.netlify/images?url=${encodedBgImgUrl}&w=${finalWidth}&h=${finalHeight}&fit=cover&q=80`;

    // 3. SVG의 <image> 태그에 위에서 생성한 Netlify URL을 직접 연결합니다.
    //    이제 Base64 인코딩이 필요 없습니다.
    backgroundContent = `<image href="${netlifyImageUrl}" x="0" y="0" width="${finalWidth}" height="${finalHeight}" preserveAspectRatio="xMidYMid slice"/>`;

    // --- ----------------------------------------------- ---

  } else {
    // 배경 이미지가 없을 경우, 회색 사각형을 표시합니다.
    backgroundContent = `<rect width="100%" height="100%" fill="#cccccc" />`;
  }
  
  // (SVG 텍스트 및 박스 생성 로직은 이전과 동일)
  const boxHeight = finalHeight * 0.25;
  const boxY = finalHeight - boxHeight;
  const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
  const textPaddingX = finalWidth * 0.03;
  const textY = boxY + (boxHeight / 2);
  
  const svg = `<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg">${backgroundContent}${text ? `<rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor || 'rgba(0,0,0,0.5)'}" /><text x="${textPaddingX}" y="${textY}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor || '#FFFFFF'}" text-anchor="start" dominant-baseline="middle">${text}</text>` : ''}</svg>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      // 브라우저와 CDN에 1시간 동안 캐시하도록 설정하여 반복 요청 시 속도를 높입니다.
      'Cache-Control': 'public, max-age=3600, must-revalidate'
    },
    body: svg,
  };
};
