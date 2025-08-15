// --- [보안 설정] 이미지 URL 허용 목록 ---
const ALLOWED_IMAGE_HOSTS = [
  'images.unsplash.com',
  'i.imgur.com',
  'raw.githubusercontent.com',
];

// --- 설정 ---
const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 630;
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
        const errorMessage = e.message === 'Host not allowed'
          ? 'Host not allowed. Please use an image from an approved domain.'
          : 'Invalid or disallowed image URL.';
        return new Response(errorMessage, {
          status: 400,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    }

    if (!imageUrl || !text) {
      const usageImageUrl = 'https://images.unsplash.com/photo-1484417894907-623942c8ee29?w=1200';
      const usageText = "Usage: ?img=<ALLOWED_URL>&text=<TEXT>&name=<NAME>";
      const { width, height } = { width: 1200, height: 630 };
      const fontSize = height * FONT_SIZE_RATIO;
      const lines = wrapText(usageText, width - PADDING * 2, fontSize);
      return generateSvgResponse({ width, height, imageUrl: usageImageUrl, lines, fontSize, name: "Example" });
    }

    const { width, height } = await getImageDimensions(imageUrl, ctx);
    const fontSize = Math.max(20, height * FONT_SIZE_RATIO);
    const lines = wrapText(text, width - PADDING * 2, fontSize);
    
    return generateSvgResponse({ width, height, imageUrl, lines, fontSize, name });
  },
};

// --- 헬퍼 함수 ---
// (아래 함수들은 변경 없이 그대로 사용)

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','\'':'&apos;','"':'&quot;'}[c]));
}

function wrapText(text, maxWidth, fontSize) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0] || '';
  const avgCharWidth = fontSize * 0.55;
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    if ((currentLine + " " + word).length * avgCharWidth < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

async function getImageDimensions(url, ctx) { // 'context' -> 'ctx'
  const cache = caches.default;
  const cacheKey = new Request(url.toString() + '-dimensions');
  let cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) return cachedResponse.json();

  try {
    const response = await fetch(url, { headers: { 'Range': 'bytes=0-65536' } });
    if (!response.ok) throw new Error('Image fetch failed');
    const buffer = await response.arrayBuffer();
    const view = new DataView(buffer);
    let dimensions;

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
    
    if (dimensions) {
      // ctx.waitUntil을 사용하여 백그라운드에서 캐시 작업을 수행
      ctx.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(dimensions), { headers: { 'Cache-Control': 'public, max-age=2592000' } })));
      return dimensions;
    }
    throw new Error('Unsupported image format');
  } catch (error) {
    console.error(`Dimension fetch error for ${url}:`, error);
    return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  }
}

function generateSvgResponse({ width, height, imageUrl, lines, fontSize, name }) {
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
  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><defs><style>.caption{font-family:${FONT_FAMILY};font-size:${fontSize}px;fill:white;font-weight:600;}.name-caption{font-family:${FONT_FAMILY};font-size:${fontSize*0.75}px;fill:white;font-weight:700;}</style></defs><image href="${escapeXml(imageUrl)}" x="0" y="0" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" /><rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="rgba(0,0,0,0.6)" />${nameElements}<text x="${PADDING}" y="${boxY+textOffsetY+fontSize}" class="caption">${lines.map((line,index)=>`<tspan x="${PADDING}" dy="${index===0?'0':`${LINE_HEIGHT}em`}">${escapeXml(line)}</tspan>`).join('')}</text></svg>`;
  return new Response(svg, { headers: { 'Content-Type':'image/svg+xml; charset=utf-8', 'Cache-Control':'public, max-age=86400, s-maxage=2592000' } });
}
