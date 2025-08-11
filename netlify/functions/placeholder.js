// Netlify 함수의 기본 형식입니다. (async 추가됨)
exports.handler = async function(event, context) {
  // 1. URL 파라미터를 읽어옵니다. (bgImg 추가!)
  const {
    w = '600',
    h = '400',
    text = '',
    bgImg, // 배경 이미지 URL
    bgColor = 'rgba(0, 0, 0, 0.5)', // 텍스트 뒤에 깔릴 반투명 박스 색상
    textColor = '#FFFFFF',
    fontSize,
  } = event.queryStringParameters;

  const width = parseInt(w, 10);
  const height = parseInt(h, 10);
  const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(width / 20);

  let backgroundContent = '';

  // 2. 만약 bgImg 파라미터가 있다면, 이미지를 다운받아 Base64로 변환합니다.
  if (bgImg) {
    try {
      // 서버에서 이미지 URL로 요청을 보냅니다.
      const imageResponse = await fetch(bgImg);
      if (!imageResponse.ok) throw new Error('Image fetch failed');
      
      // 이미지를 버퍼 데이터로 변환합니다.
      const imageBuffer = await imageResponse.arrayBuffer();
      // 버퍼를 Base64 텍스트로 인코딩합니다.
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      // 이미지 타입을 알아냅니다. (예: 'image/png')
      const imageMimeType = imageResponse.headers.get('content-type');

      // SVG에 삽입할 이미지 태그를 만듭니다. (데이터를 직접 심는 방식)
      backgroundContent = `
        <image
          href="data:${imageMimeType};base64,${imageBase64}"
          x="0"
          y="0"
          width="${width}"
          height="${height}"
          preserveAspectRatio="xMidYMid slice"
        />
      `;
    } catch (error) {
      console.error(error);
      // 이미지 로딩 실패 시, 에러 텍스트를 표시합니다.
      backgroundContent = `<rect width="100%" height="100%" fill="#ccc" /><text x="50%" y="50%" fill="black">Image Load Error</text>`;
    }
  } else {
    // bgImg가 없으면 단색 배경을 칠합니다.
    backgroundContent = `<rect width="100%" height="100%" fill="#cccccc" />`;
  }

  // 3. 최종 SVG 코드를 조립합니다. (레이어 순서: 배경 > 반투명박스 > 텍스트)
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${backgroundContent}
      
      <!-- 텍스트가 있을 경우에만 반투명 박스와 텍스트를 그립니다 -->
      ${text ? `
        <rect x="0" y="${height * 0.7}" width="100%" height="${height * 0.3}" fill="${bgColor}" />
        <text
          x="30"
          y="${height * 0.7 + (height * 0.3 / 2)}"
          font-family="Arial, sans-serif"
          font-size="${finalFontSize}"
          fill="${textColor}"
          text-anchor="start"
          dominant-baseline="middle"
        >
          ${text}
        </text>
      ` : ''}
    </svg>
  `;

  // 4. 생성된 SVG 이미지를 반환합니다.
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600, immutable', // 캐시 시간 변경
    },
    body: svg,
  };
};
