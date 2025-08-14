// functions/image.js
import Vips from 'wasm-vips';

// 기본 상수 설정
const FONT_SIZE = 48;
const PADDING = 20;

// Cloudflare Pages Function 핸들러
export async function onRequest(context) {
  try {
    const { searchParams } = new URL(context.request.url);

    const imageUrl = searchParams.get('url');
    const text = searchParams.get('text') || ' '; // 텍스트가 없으면 빈 값

    if (!imageUrl) {
      return new Response('Error: Image URL parameter is required.', { status: 400 });
    }

    // 1. 외부 이미지 다운로드
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return new Response('Error: Failed to fetch the image.', { status: imageResponse.status });
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // Vips 초기화 (WASM 모듈 로딩)
    await Vips.init();

    // 2. 이미지 처리 시작
    let image = Vips.Image.newFromBuffer(imageBuffer);

    // 3. 텍스트를 위한 반투명 배경 박스 생성
    const textWidth = text.length * (FONT_SIZE * 0.6); // 대략적인 너비 계산
    const boxHeight = FONT_SIZE + PADDING * 2;
    const boxY = image.height - boxHeight;

    // 검은색, 70% 투명도를 가진 박스를 이미지 하단에 그리기
    image = image.drawRect(
      [0, 0, 0, 0.7], // RGBA 색상 (검은색, 70% 알파)
      0,             // x 좌표
      boxY,          // y 좌표
      image.width,   // 너비
      boxHeight,     // 높이
      { fill: true }
    );

    // 4. 텍스트 그리기
    image = image.text({
      text: text,
      font: 'sans-serif bold', // 사용 가능한 폰트
      width: image.width - PADDING * 2,
      height: FONT_SIZE,
      align: 'centre', // 중앙 정렬
      dpi: 72,
      rgba: true
    }).composite(image, 'atop', {
      x: image.width / 2,
      y: boxY + PADDING + (FONT_SIZE/2),
      compositing_space: 'srgb'
    });


    // 5. 최종 이미지를 버퍼로 변환 (JPG 형식, 품질 85%)
    const finalImageBuffer = image.writeToBuffer('.jpg', { Q: 85 });

    // 6. 이미지 응답 반환
    return new Response(finalImageBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, s-maxage=86400', // 24시간 동안 CDN에 캐시
      },
    });

  } catch (error) {
    console.error(error);
    return new Response(`An error occurred: ${error.message}`, { status: 500 });
  }
}
