const imageSize = require('image-size');

// --- ✨ 여기가 핵심! 자주 쓰는 이미지의 "VIP 리스트" ✨ ---
// 여기에 등록된 이미지 링크로 요청이 오면, 데이터 소모 없이 바로 원본으로 연결됩니다.
const vipList = {
  "https://i.imgur.com/Arrgdne.png": true,
  "https://raw.githubusercontent.com/tlsdlq/-/main/%EA%B0%95%EC%95%84%EC%A7%800.jpg": true, "https://itimg.kr/21/1/01/2.webp": true
};

exports.handler = async function(event, context) {
  const { w, h, text = '', bgImg, bgColor, textColor, fontSize } = event.queryStringParameters;

  // 1. VIP 리스트에 있는 이미지인지 확인
  if (bgImg && vipList[bgImg]) {
    // VIP라면, 요리(Base64 변환)를 하지 않고 원본 주소로 바로 보냅니다 (Redirect).
    return {
      statusCode: 302, // 302: "찾는 건 저쪽에 있어요" 라는 신호
      headers: {
        'Location': bgImg, // Location 헤더에 원본 이미지 주소를 넣어줌
        'Cache-Control': 'public, max-age=604800, immutable', // 7일간 캐시
      }
    };
  }

  // --- 2. VIP가 아닌, 처음 보는 이미지는 여기서부터 기존 방식으로 처리 ---
  let finalWidth, finalHeight, backgroundContent = '', errorText = '';

  if (bgImg) {
    try {
      // (이전과 동일한 Base64 변환 로직)
      const imageResponse = await fetch(bgImg);
      if (!imageResponse.ok) throw new Error(`Fetch failed: ${imageResponse.status}`);
      const imageAsBuffer = Buffer.from(await imageResponse.arrayBuffer());
      if (w && h) {
        finalWidth = parseInt(w, 10); finalHeight = parseInt(h, 10);
      } else {
        const dimensions = imageSize(imageAsBuffer);
        finalWidth = dimensions.width; finalHeight = dimensions.height;
      }
      const imageBase64 = imageAsBuffer.toString('base64');
      const imageMimeType = imageResponse.headers.get('content-type') || 'image/png';
      backgroundContent = `<image href="data:${imageMimeType};base64,${imageBase64}" x="0" y="0" width="${finalWidth}" height="${finalHeight}" preserveAspectRatio="xMidYMid slice"/>`;
    } catch (err) {
      finalWidth = 600; finalHeight = 400; errorText = 'Image Load Error!';
      backgroundContent = `<rect width="100%" height="100%" fill="#ccc" />`;
    }
  } else {
    finalWidth = parseInt(w || '300', 10); finalHeight = parseInt(h || '150', 10);
    backgroundContent = `<rect width="100%" height="100%" fill="#cccccc" />`;
  }
  
  // (이전과 동일한 SVG 생성 로직)
  const boxHeight = finalHeight * 0.25;
  const boxY = finalHeight - boxHeight;
  const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
  const textPaddingX = finalWidth * 0.03;
  const textY = boxY + (boxHeight / 2);
  const svg = `<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg">${backgroundContent}${text || errorText ? `<rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor || 'rgba(0,0,0,0.5)'}" /><text x="${textPaddingX}" y="${textY}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor || '#FFFFFF'}" text-anchor="start" dominant-baseline="middle">${errorText || text}</text>` : ''}</svg>`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache' },
    body: svg,
  };
};
