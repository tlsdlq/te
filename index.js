import { Buffer } from 'node:buffer';

const CACHE_VERSION = 'v1'; // 캐시 버전은 그대로 유지합니다.
const ALLOWED_IMAGE_HOSTS = ['images.unsplash.com', 'i.imgur.com', 'raw.githubusercontent.com', 'itimg.kr'];
const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 630;
const PADDING = 40;
const FONT_SIZE_RATIO = 0.04;
const LINE_HEIGHT = 1.4;
const FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export default {
  async fetch(request, env, ctx) {
    // ... 이 부분은 변경 없습니다 ...
    const url = new URL(request.url);
    const params = url.searchParams;
    const imageUrl = params.get('img');
    const text = params.get('text');
    const name = params.get('name');

    if (imageUrl) {
        try {
            const imageUrlObject = new URL(imageUrl);
            if (imageUrlObject.protocol !== 'https:' && imageUrlObject.protocol !== 'http:') throw new Error('Invalid protocol');
            if (!ALLOWED_IMAGE_HOSTS.includes(imageUrlObject.hostname)) throw new Error('Host not allowed');
        } catch (e) {
            return new Response(e.message === 'Host not allowed' ? 'Host not allowed.' : 'Invalid image URL.', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        }
    }

    if (!imageUrl || !text) {
        const usageImageUrl = 'https://images.unsplash.com/photo-1484417894907-623942c8ee29?w=1200';
        const usageText = "Usage: ?img=<ALLOWED_URL>&text=<TEXT>&name=<NAME>";
        const { image, width, height } = { image: { contentType: 'image/jpeg', base64: '' }, width: 1200, height: 630 };
        const fontSize = height * FONT_SIZE_RATIO;
        const lines = wrapText(usageText, width - PADDING * 2, fontSize);
        return generateSvgResponse({ width, height, imageUrl, image, lines, fontSize, name: "Example" });
    }

    try {
        const { image, width, height } = await fetchAndProcessImage(imageUrl, ctx);
        const fontSize = Math.max(20, height * FONT_SIZE_RATIO);
        const lines = wrapText(text, width - PADDING * 2, fontSize);
        return generateSvgResponse({ width, height, imageUrl, image, lines, fontSize, name });
    } catch (error) {
        console.error('Image processing failed:', error);
        const errorText = `Error: Image could not be loaded. (${error.message})`;
        const { width, height } = { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
        const fontSize = height * 0.03;
        const lines = wrapText(errorText, width - PADDING * 2, fontSize);
        return generateErrorSvgResponse({ width, height, lines, fontSize });
    }
  },
};

// --- 헬퍼 함수 ---

async function fetchAndProcessImage(url, ctx) {
    const cache = caches.default;
    // 캐싱 기능은 선생님 말씀대로 완벽하게 원상 복구했습니다.
    const cacheKey = new Request(url.toString() + `&cache_version=${CACHE_VERSION}`);
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
        return cachedResponse.json();
    }

    const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
    });
    if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);

    // [핵심] 진짜 이미지 파일인지 "신분증 검사"를 합니다.
    const contentType = response.headers.get('Content-Type');
    if (!contentType || !contentType.startsWith('image/')) {
        throw new Error(`Invalid content type: Expected 'image/*', but got '${contentType}'`);
    }

    const buffer = await response.arrayBuffer();
    const image = {
        contentType,
        base64: Buffer.from(buffer).toString('base64')
    };

    const view = new DataView(buffer);
    let dimensions = { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
    try {
        if (view.getUint16(0, false) === 0xFFD8) { let offset = 2; while (offset < view.byteLength) { if (view.getUint16(offset, false) === 0xFFC0) { dimensions = { height: view.getUint16(offset + 5, false), width: view.getUint16(offset + 7, false) }; break; } offset += 2 + view.getUint16(offset + 2, false); } }
        else if (view.getUint32(0, false) === 0x89504E47) { dimensions = { width: view.getUint32(16, false), height: view.getUint32(20, false) }; }
    } catch (e) {}

    const result = { image, width: dimensions.width, height: dimensions.height };
    
    ctx.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(result), { headers: { 'Cache-Control': 'public, max-age=2592000' } })));
    return result;
}

// ... 나머지 SVG 생성 함수들은 변경할 필요가 없습니다 ...
function generateErrorSvgResponse({ width, height, lines, fontSize }) { const boxHeight = (lines.length * fontSize * LINE_HEIGHT) + (PADDING * 1.5); const boxY = (height - boxHeight) / 2; const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><defs><style>.caption{font-family:${FONT_FAMILY};font-size:${fontSize}px;fill:white;font-weight:600;}</style></defs><rect x="0" y="0" width="100%" height="100%" fill="#555" /><rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="rgba(0,0,0,0.6)" /><text x="${PADDING}" y="${boxY + PADDING * 0.5 + fontSize}" class="caption">${lines.map((line, index) => `<tspan x="${PADDING}" dy="${index === 0 ? '0' : `${LINE_HEIGHT}em`}">${escapeXml(line)}</tspan>`).join('')}</text></svg>`; return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'no-cache' } });}
function escapeXml(unsafe) { return unsafe.replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','\'':'&apos;','"':'&quot;'}[c])); }
function wrapText(text, maxWidth, fontSize) { const words = text.split(' '); const lines = []; let currentLine = words[0] || ''; const avgCharWidth = fontSize * 0.55; for (let i = 1; i < words.length; i++) { const word = words[i]; if ((currentLine + " " + word).length * avgCharWidth < maxWidth) { currentLine += " " + word; } else { lines.push(currentLine); currentLine = word; } } lines.push(currentLine); return lines; }
function generateSvgResponse({ width, height, imageUrl, image, lines, fontSize, name }) { const imageHref = image.base64 ? `data:${image.contentType};base64,${image.base64}` : escapeXml(imageUrl); const boxHeight = (lines.length * fontSize * LINE_HEIGHT) + (PADDING * 1.5) + (name ? fontSize : 0); const boxY = height - boxHeight; let nameElements = ''; if (name) { const nameFontSize = fontSize * 0.75; const nameBoxHeight = nameFontSize * 1.8; const nameTextWidth = name.length * nameFontSize * 0.6; const nameBoxPadding = nameFontSize * 0.8; const p1 = `0,${boxY}`; const p2 = `${nameTextWidth + nameBoxPadding * 2},${boxY}`; const p3 = `${nameTextWidth + nameBoxPadding * 2 + nameBoxHeight * 0.5},${boxY + nameBoxHeight}`; const p4 = `0,${boxY + nameBoxHeight}`; nameElements = `<polygon points="${p1} ${p2} ${p3} ${p4}" fill="rgba(255,255,255,0.25)"/><text x="${nameBoxPadding}" y="${boxY + nameBoxHeight / 2}" class="name-caption" dominant-baseline="central">${escapeXml(name)}</text>`; } const textOffsetY = name ? fontSize * 1.5 : PADDING * 0.5; const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><defs><style>.caption{font-family:${FONT_FAMILY};font-size:${fontSize}px;fill:white;font-weight:600;}.name-caption{font-family:${FONT_FAMILY};font-size:${fontSize*0.75}px;fill:white;font-weight:700;}</style></defs><image href="${imageHref}" x="0" y="0" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" /><rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="rgba(0,0,0,0.6)" />${nameElements}<text x="${PADDING}" y="${boxY+textOffsetY+fontSize}" class="caption">${lines.map((line,index)=>`<tspan x="${PADDING}" dy="${index===0?'0':`${LINE_HEIGHT}em`}">${escapeXml(line)}</tspan>`).join('')}</text></svg>`; return new Response(svg, { headers: { 'Content-Type':'image/svg+xml; charset=utf-8', 'Cache-Control':'public, max-age=86400, s-maxage=2592000' } }); }
