// --- [보안 설정] 이미지 URL 허용 목록 ---
const ALLOWED_IMAGE_HOSTS = [
  'images.unsplash.com',
  'i.imgur.com',
  'raw.githubusercontent.com',
  'itimg.kr',
];

// --- 설정 ---
const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 630;
const PADDING = 40;
const FONT_SIZE_RATIO = 0.04;
const LINE_HEIGHT = 1.4;
const FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// --- 메인 핸들러: Cloudflare Workers의 진입점 ---
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const params = url.searchParams;

    const imageUrl = params.get('img');
    const text = params.get('text');
    const name = params.get('name');

    // --- [보안 강화] URL 유효성 및 허용 목록 검사 ---
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
        // ... (오류 처리 부분은 이전과 동일)
        const errorMessage = e.message === 'Host not allowed' ? 'Host not allowed.' : 'Invalid image URL.';
        return new Response(errorMessage, { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    }

    if (!imageUrl || !text) {
      // ... (사용법 안내 부분은 이전과 동일)
      const usageImageUrl = 'https://images.unsplash.com/photo-1484417894907-623942c8ee29?w=1200';
      const usageText = "Usage: ?img=<ALLOWED_URL>&text=<TEXT>&name=<NAME>";
      const { image, width, height } = { 
        image: { contentType: 'image/jpeg', base64: ''}, // 예제는 이미지를 로드하지 않음
        width: 1200, 
        height: 630 
      };
      const fontSize = height * FONT_SIZE_RATIO;
      const lines = wrapText(usageText, width - PADDING * 2, fontSize);
      return generateSvgResponse({ width, height, imageUrl, image, lines, fontSize, name: "Example" });
    }
    
    // --- [핵심 변경] 이미지 다운로드 및 크기/데이터 가져오기 ---
    const { image, width, height } = await fetchAndProcessImage(imageUrl, ctx);
    const fontSize = Math.max(20, height * FONT_SIZE_RATIO);
    const lines = wrapText(text, width - PADDING * 2, fontSize);
    
    return generateSvgResponse({ width, height, imageUrl, image, lines, fontSize, name });
  },
};

// --- 헬퍼 함수들 ---

// Base64 인코딩을 위한 헬퍼 (의존성 없음)
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// [새 함수] 이미지를 가져와 Base64로 인코딩하고 크기를 파싱하는 함수
async function fetchAndProcessImage(url, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), { headers: { 'Accept': 'image/*' }});
  let cachedResponse = await cache.match(cacheKey);

  if (cachedResponse) {
    const cachedData = await cachedResponse.json();
    return cachedData;
  }
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Image fetch failed');
  
  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get('Content-Type') || 'image/jpeg';

  const image = {
    contentType,
    base64: arrayBufferToBase64(buffer)
  };
  
  // 이미지 크기 분석 (기존 로직 재사용)
  const view = new DataView(buffer);
  let dimensions = { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  try {
      if (view.getUint16(0, false) === 0xFFD8) { // JPEG
        let offset = 2;
        while (offset < view.byteLength) {
          if (view.getUint16(offset, false) === 0xFFC0) {
            dimensions = { height: view.getUint16(offset + 5, false), width: view.getUint16(offset + 7, false) };
            break;
          }
          offset += 2 + view.getUint16(offset + 2, false);
        }
      } else if (view.getUint32(0, false) === 0x89504E47) { // PNG
        dimensions = { width: view.getUint32(16, false), height: view.getUint32(20, false) };
      }
  } catch(e) { /* 크기 분석 실패 시 기본값 사용 */ }

  const result = { image, width: dimensions.width, height: dimensions.height };
  
  // waitUntil을 사용하여 응답을 보낸 후 캐시에 저장
  ctx.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(result), { headers: { 'Cache-Control': 'public, max-age=2592000' } })));

  return result;
}


// [수정된 함수] SVG 생성 함수
function generateSvgResponse({ width, height, imageUrl, image, lines, fontSize, name }) {
  // image.base64가 비어있으면(예제 안내 페이지의 경우) 외부 URL을 사용
  const imageHref = image.base64 
    ? `data:${image.contentType};base64,${image.base64}`
    : escapeXml(imageUrl);

  const boxHeight = (lines.length * fontSize * LINE_HEIGHT) + (PADDING * 1.5) + (name ? fontSize : 0);
  const boxY = height - boxHeight;
  let nameElements = '';
  if (name) {
    const nameFontSize = fontSize * 0.75;
    const nameBoxHeight = nameFontSize * 1.8;
    const nameTextWidth = name.length * nameFontSize * 0.6;
    const nameBoxPadding = nameFontSize * 0.8;
    const p1 = `0,${boxY}`;
    const p2 = `${nameTextWidth + nameBoxPadding * 2},${boxY}`;
    const p3 = `${nameTextWidth + nameBoxPadding * 2 + nameBoxHeight * 0.5},${boxY + nameBoxHeight}`;
    const p4 = `0,${boxY + nameBoxHeight}`;
    nameElements = `<polygon points="${p1} ${p2} ${p3} ${p4}" fill="rgba(255,255,255,0.25)"/><text x="${nameBoxPadding}" y="${boxY + nameBoxHeight / 2}" class="name-caption" dominant-baseline="central">${escapeXml(name)}</text>`;
  }
  const textOffsetY = name ? fontSize * 1.5 : PADDING * 0.5;
  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmln
