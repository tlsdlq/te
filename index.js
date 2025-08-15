// --- [보안 설정] 이미지 URL 허용 목록 ---
const ALLOWED_IMAGE_HOSTS = [
  'images.unsplash.com',
  'i.imgur.com',
  'raw.githubusercontent.com',
  'itimg.kr', // itimg.kr 추가
];

// --- 설정 ---
const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 630;
// ... (나머지 설정은 동일)
const PADDING = 40;
const FONT_SIZE_RATIO = 0.04;
const LINE_HEIGHT = 1.4;
const FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// --- 메인 핸들러 ---
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const params = url.searchParams;

    const imageUrl = params.get('img');
    const text = params.get('text');
    const name = params.get('name');
    
    // ... (URL 유효성 검사 로직은 동일)
    if (imageUrl) {
        try {
            const imageUrlObject = new URL(imageUrl);
            if (imageUrlObject.protocol !== 'https:' && imageUrlObject.protocol !== 'http:') {
                throw new Error('Invalid protocol');
            }
            if (!ALLOWED_IMAGE_HOSTS.includes(imageUrlObject.hostname)) {
                throw new Error('Host not allowed');
            }
        } catch (e) {
            const errorMessage = e.message === 'Host not allowed' ? 'Host not allowed.' : 'Invalid image URL.';
            return new Response(errorMessage, { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        }
    }

    if (!imageUrl || !text) {
        // ... (사용법 안내 로직은 동일)
        const usageImageUrl = 'https://images.unsplash.com/photo-1484417894907-623942c8ee29?w=1200';
        const usageText = "Usage: ?img=<ALLOWED_URL>&text=<TEXT>&name=<NAME>";
        const { image, width, height } = { image: { contentType: 'image/jpeg', base64: ''}, width: 1200, height: 630 };
        const fontSize = height * FONT_SIZE_RATIO;
        const lines = wrapText(usageText, width - PADDING * 2, fontSize);
        return generateSvgResponse({ width, height, imageUrl, image, lines, fontSize, name: "Example" });
    }
    
    try {
        // [개선] 이미지 처리 부분을 try...catch로 감싸서 오류를 핸들링
        const { image, width, height } = await fetchAndProcessImage(imageUrl, ctx);
        const fontSize = Math.max(20, height * FONT_SIZE_RATIO);
        const lines = wrapText(text, width - PADDING * 2, fontSize);
        
        return generateSvgResponse({ width, height, imageUrl, image, lines, fontSize, name });

    } catch (error) {
        // [개선] 오류 발생 시, 에러 메시지를 담은 SVG를 생성
        console.error('Image processing failed:', error);
        const errorText = `Error: Image could not be loaded. (${error.message})`;
        const { width, height } = { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
        const fontSize = height * 0.03; // 에러 텍스트는 조금 작게
        const lines = wrapText(errorText, width - PADDING * 2, fontSize);

        // 이미지가 없으므로 빈 회색 배경과 에러 텍스트만 표시
        return generateErrorSvgResponse({ width, height, lines, fontSize });
    }
  },
};

// --- 헬퍼 함수들 ---

// [수정된 함수] User-Agent 헤더를 추가하여 서버 차단 회피
async function fetchAndProcessImage(url, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), { headers: { 'Accept': 'image/*' }});
  let cachedResponse = await cache.match(cacheKey);

  if (cachedResponse) {
    const cachedData = await cachedResponse.json();
    return cachedData;
  }
  
  // [핵심 수정] fetch 요청 시 브라우저처럼 보이도록 User-Agent 헤더 추가
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });

  if (!response.ok) {
    // 서버가 이미지를 주지 않으면(예: 403 Forbidden) 에러 발생
    throw new Error(`Fetch failed with status ${response.status}`);
  }
  
  const buffer = await response.arrayBuffer();
  // ... (이하 로직은 이전과 동일)
  const contentType = response.headers.get('Content-Type') || 'image/jpeg';
  const image = { contentType, base64: arrayBufferToBase64(buffer) };
  
  const view = new DataView(buffer);
  let dimensions = { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  try {
      if (view.getUint16(0, false) === 0xFFD8) {
        let offset = 2;
        while (offset < view.byteLength) { if (view.getUint16(offset, false) === 0xFFC0) { dimensions = { height: view.getUint16(offset + 5, false), width: view.getUint16(offset + 7, false) }; break; } offset += 2 + view.getUint16(offset + 2, false); }
      } else if (view.getUint32(0, false) === 0x89504E47) {
        dimensions = { width: view.getUint32(16, false), height: view.getUint32(20, false) };
      }
  } catch(e) { /* 크기 분석 실패 시 기본값 사용 */ }

  const result = { image, width: dimensions.width, height: dimensions.height };
  ctx.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(result), { headers: { 'Cache-Control': 'public, max-age=2592000' } })));
  return result;
}

// [새 함수] 오류 상황에 표시할 SVG를 생성하는 함수
function generateErrorSvgResponse({ width, height, lines, fontSize }) {
    const boxHeight = (lines.length * fontSize * LINE_HEIGHT) + (PADDING * 1.5);
    const boxY = (height - boxHeight) / 2; // 중앙 정렬

    const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs><style>.caption{font-family:${FONT_FAMILY};font-size:${fontSize}px;fill:white;font-weight:600;}</style></defs>
  <rect x="0" y="0" width="100%" height="100%" fill="#555" />
  <rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="rgba(0,0,0,0.6)" />
  <text x="${PADDING}" y="${boxY + PADDING * 0.5 + fontSize}" class="caption">
    ${lines.map((line, index) => `<tspan x="${PADDING}" dy="${index === 0 ? '0' : `${LINE_HEIGHT}em`}">${escapeXml(line)}</tspan>`).join('')}
  </text>
</svg>`;
    return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'no-cache' } });
}


// --- 나머지 헬퍼 함수들 (변경 없음) ---
// ... generateSvgResponse, escapeXml, wrapText, arrayBufferToBase64 ...
// (위 함수들은 이전 답변의 코드를 그대로 사용하면 됩니다)
function arrayBufferToBase64(buffer) { let binary = ''; const bytes = new UintArray(buffer); const len = bytes.byteLength; for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); } return btoa(binary); }
function escapeXml(unsafe) { return unsafe.replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','\'':'&apos;','"':'&quot;'}[c])); }
function wrapText(text, maxWidth, fontSize) { const words = text.split(' '); const lines = []; let currentLine = words[0] || ''; const avgCharWidth = fontSize * 0.55; for (let i = 1; i < words.length; i++) { const word = words[i]; if ((currentLine + " " + word).length * avgCharWidth < maxWidth) { currentLine += " " + word; } else { lines.push(currentLine); currentLine = word; } } lines.push(currentLine); return lines; }
function generateSvgResponse({ width, height, imageUrl, image, lines, fontSize, name }) { const imageHref = image.base64 ? `data:${image.contentType};base64,${image.base64}` : escapeXml(imageUrl); const boxHeight = (lines.length * fontSize * LINE_HEIGHT) + (PADDING * 1.5) + (name ? fontSize : 0); const boxY = height - boxHeight; let nameElements = ''; if (name) { const nameFontSize = fontSize * 0.75; const nameBoxHeight = nameFontSize * 1.8; const nameTextWidth = name.length * nameFontSize * 0.6; const nameBoxPadding = nameFontSize * 0.8; const p1 = `0,${boxY}`; const p2 = `${nameTextWidth + nameBoxPadding * 2},${boxY}`; const p3 = `${nameTextWidth + nameBoxPadding * 2 + nameBoxHeight * 0.5},${boxY + nameBoxHeight}`; const p4 = `0,${boxY + nameBoxHeight}`; nameElements = `<polygon points="${p1} ${p2} ${p3} ${p4}" fill="rgba(255,255,255,0.25)"/><text x="${nameBoxPadding}" y="${boxY + nameBoxHeight / 2}" class="name-caption" dominant-baseline="central">${escapeXml(name)}</text>`; } const textOffsetY = name ? fontSize * 1.5 : PADDING * 0.5; const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><defs><style>.caption{font-family:${FONT_FAMILY};font-size:${fontSize}px;fill:white;font-weight:600;}.name-caption{font-family:${FONT_FAMILY};font-size:${fontSize*0.75}px;fill:white;font-weight:700;}</style></defs><image href="${imageHref}" x="0" y="0" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" /><rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="rgba(0,0,0,0.6)" />${nameElements}<text x="${PADDING}" y="${boxY+textOffsetY+fontSize}" class="caption">${lines.map((line,index)=>`<tspan x="${PADDING}" dy="${index===0?'0':`${LINE_HEIGHT}em`}">${escapeXml(line)}</tspan>`).join('')}</text></svg>`; return new Response(svg, { headers: { 'Content-Type':'image/svg+xml; charset=utf-8', 'Cache-Control':'public, max-age=86400, s-maxage=2592000' } }); }
