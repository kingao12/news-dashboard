import { NextResponse } from 'next/server';

let sentimentCache: { data: any; ts: number } | null = null;
const CACHE_TTL = 30000; // 30 seconds

const getSentimentLabel = (v: number) => {
  if (v <= 20) return { label: '극단적 공포', en: 'Extreme Fear', color: '#ef4444' };
  if (v <= 40) return { label: '공포', en: 'Fear', color: '#f97316' };
  if (v <= 60) return { label: '중립', en: 'Neutral', color: '#eab308' };
  if (v <= 80) return { label: '탐욕', en: 'Greed', color: '#22c55e' };
  return { label: '극단적 탐욕', en: 'Extreme Greed', color: '#10b981' };
};

export async function GET() {
  const now = Date.now();
  if (sentimentCache && now - sentimentCache.ts < CACHE_TTL) {
    return NextResponse.json(sentimentCache.data, {
      headers: { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=40' }
    });
  }

  try {
    // 1. Real Crypto Fear & Greed from alternative.me
    let cryptoVal = 50;
    let cryptoPrev = 52;
    let cryptoChange = 0;
    try {
      const res = await fetch('https://api.alternative.me/fng/?limit=2', { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const d = await res.json();
        cryptoVal = parseInt(d.data[0].value, 10);
        cryptoPrev = parseInt(d.data[1]?.value || '50', 10);
        cryptoChange = cryptoVal - cryptoPrev;
      }
    } catch {}

    // 2. Simulate Stock Market indexes (CNN-style algorithm)
    const base = 58; const h = new Date().getHours();
    const stockVal = Math.min(95, Math.max(5, base + Math.sin(h * 0.4) * 12 + (Math.random() - 0.5) * 4));
    const koreaVal = Math.min(95, Math.max(5, stockVal - 5 + (Math.random() - 0.5) * 8));
    const japanVal = Math.min(95, Math.max(5, stockVal + 3 + (Math.random() - 0.5) * 6));
    const euroVal  = Math.min(95, Math.max(5, stockVal - 2 + (Math.random() - 0.5) * 7));
    const chinaVal = Math.min(95, Math.max(5, stockVal - 10 + (Math.random() - 0.5) * 10));

    // 3. Simulated Volatility Index (VIX-style)
    const vix = Math.max(12, Math.min(45, 18 + (100 - stockVal) * 0.25 + (Math.random() - 0.5) * 3));

    const cryptoInfo = getSentimentLabel(cryptoVal);
    const data = {
      crypto: {
        value: cryptoVal,
        previousValue: cryptoPrev,
        change: cryptoChange,
        ...cryptoInfo
      },
      stocks: {
        global: { value: Math.round(stockVal), ...getSentimentLabel(stockVal) },
        korea: { value: Math.round(koreaVal), ...getSentimentLabel(koreaVal) },
        japan: { value: Math.round(japanVal), ...getSentimentLabel(japanVal) },
        europe: { value: Math.round(euroVal), ...getSentimentLabel(euroVal) },
        china: { value: Math.round(chinaVal), ...getSentimentLabel(chinaVal) },
      },
      vix: Math.round(vix * 10) / 10,
      lastUpdated: new Date().toISOString()
    };

    sentimentCache = { data, ts: now };
    return NextResponse.json(data);

  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
