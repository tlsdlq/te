// Netlify 함수의 기본 형식입니다.
exports.handler = async function(event, context) {
  // 1. URL 파라미터를 읽어옵니다. (Vercel과 읽는 방식이 다릅니다!)
  const {
    w = '300',
    h = '150',
    text = `${w} x ${h}`,
    bgColor = '#cccccc',
    textColor = '#888888',
    fontSize,
  } = event.queryStringParameters;

  const width = parseInt(w, 10);
  const height = parseInt(h, 10);
  const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(width / 10);

  // 2. SVG 코드를 생성하는 부분은 동일합니다.
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bgColor}" />
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">
        ${text}
      </text>
    </svg>
  `;

  // 3. '이미지'로 응답하는 방식이 다릅니다.
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
    body: svg, // 본문을 body에 담아 반환
  };
};
