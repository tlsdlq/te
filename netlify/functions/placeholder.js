const imageSize = require('image-size');
// 이제 인기 이미지 목록을 함수 안에서도 사용합니다.
const popularImages = require('../../popular_images.json'); 

exports.handler = async function(event, context) {
  // bgImgKey 라는 새로운 파라미터를 사용합니다.
  const { w, h, text, bgImg, bgImgKey, bgColor, textColor, fontSize } = event.queryStringParameters;

  // 만약 bgImgKey가 있고, 우리 목록에 있는 키라면, 리디렉션 로직을 사용합니다.
  if (bgImgKey && popularImages[bgImgKey]) {
    // 이 키를 위한 리디렉션 URL을 만듭니다.
    const redirectUrl = `/.netlify/functions/placeholder/img/${bgImgKey}`;
    
    // 이 URL로 사용자를 리디렉션 시킵니다.
    return {
      statusCode: 302, // 302 Found (임시 리디렉션)
      headers: {
        'Location': redirectUrl,
      }
    };
  }
  
  // --- 여기서부터는 bgImgKey가 없을 때, 즉 불특정 링크를 처리하는 이전 로직입니다 ---
  // (이전 코드와 거의 동일)

  let finalWidth, finalHeight, backgroundContent = '', errorText = '';

  if (bgImg) {
    try {
      const imageResponse = await fetch(bgImg);
      if (!imageResponse.ok) throw new Error('Fetch failed');
      const imageAsBuffer = Buffer.from(await imageResponse.arrayBuffer());

      if (w && h) {
        finalWidth = parseInt(w); finalHeight = parseInt(h);
      } else {
        const dimensions = imageSize(imageAsBuffer);
        finalWidth = dimensions.width; finalHeight = dimensions.height;
      }

      const imageBase64 = imageAsBuffer.toString('base64');
      const imageMimeType = imageResponse.headers.get('content-type') || 'image/png';
      backgroundContent = `<image href="data:${imageMimeType};base64,${imageBase64}" ... />`; // 생략
    } catch (err) { /* 에러 처리 생략 */ }
  } else { /* 단색 배경 처리 생략 */ }
  
  const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
  
  // ... 최종 SVG 생성 로직 (이전과 동일) ...
  const svg = `<svg> ... </svg>`; // 생략

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache' },
    body: svg,
  };
};
