import { NextResponse } from 'next/server';

// 무료 환율 API 복수 소스 (fallback 구조)
const RATE_SOURCES = [
  // 소스 1: exchangerate-api (무료)
  async () => {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { 
      next: { revalidate: 60 } // 60초 캐시
    });
    const data = await res.json();
    return data?.rates?.KRW as number;
  },
  // 소스 2: frankfurter.app (무료, 유럽중앙은행 데이터)
  async () => {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=KRW', {
      next: { revalidate: 60 }
    });
    const data = await res.json();
    return data?.rates?.KRW as number;
  },
];

let cachedRate: number | null = null;
let lastFetched = 0;

export async function GET() {
  try {
    // 서버 메모리 캐시: 30초
    const now = Date.now();
    if (cachedRate && now - lastFetched < 30_000) {
      return NextResponse.json({ usdKrw: cachedRate, cached: true });
    }

    // 복수 소스 순차 시도
    for (const fetchRate of RATE_SOURCES) {
      try {
        const rate = await fetchRate();
        if (rate && rate > 900 && rate < 2000) {
          // 합리적인 KRW/USD 범위 검증
          cachedRate = rate;
          lastFetched = now;
          return NextResponse.json({ usdKrw: rate, cached: false });
        }
      } catch (_) {
        continue;
      }
    }

    // 모든 소스 실패 시 캐시된 값 또는 기본값
    return NextResponse.json({ 
      usdKrw: cachedRate || 1380, 
      cached: true, 
      fallback: true 
    });

  } catch (error) {
    return NextResponse.json({ usdKrw: 1380, fallback: true });
  }
}
