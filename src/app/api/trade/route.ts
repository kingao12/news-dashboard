import { NextResponse } from 'next/server';

// Real trade data baselines (World Bank 2023 estimates, trillion USD)
const BASE_TRADE = [
  { code: 'CN', name: '중국 🇨🇳', exports: 3380, imports: 2563, balance: 817, gdp: 19000, tradeGDP: 37 },
  { code: 'US', name: '미국 🇺🇸', exports: 2020, imports: 3170, balance: -1150, gdp: 27000, tradeGDP: 19 },
  { code: 'DE', name: '독일 🇩🇪', exports: 1720, imports: 1560, balance: 160, gdp: 4200, tradeGDP: 79 },
  { code: 'JP', name: '일본 🇯🇵', exports: 715, imports: 858, balance: -143, gdp: 4300, tradeGDP: 36 },
  { code: 'KR', name: '한국 🇰🇷', exports: 632, imports: 643, balance: -11, gdp: 1700, tradeGDP: 75 },
  { code: 'NL', name: '네덜란드 🇳🇱', exports: 965, imports: 870, balance: 95, gdp: 1100, tradeGDP: 165 },
  { code: 'HK', name: '홍콩 🇭🇰', exports: 670, imports: 660, balance: 10, gdp: 400, tradeGDP: 335 },
  { code: 'FR', name: '프랑스 🇫🇷', exports: 604, imports: 701, balance: -97, gdp: 3000, tradeGDP: 44 },
  { code: 'IT', name: '이탈리아 🇮🇹', exports: 614, imports: 589, balance: 25, gdp: 2100, tradeGDP: 57 },
  { code: 'GB', name: '영국 🇬🇧', exports: 472, imports: 683, balance: -211, gdp: 3100, tradeGDP: 37 },
  { code: 'SG', name: '싱가포르 🇸🇬', exports: 515, imports: 440, balance: 75, gdp: 500, tradeGDP: 189 },
  { code: 'MX', name: '멕시코 🇲🇽', exports: 594, imports: 558, balance: 36, gdp: 1300, tradeGDP: 88 },
];

let tradeCache: { data: any; ts: number } | null = null;

export async function GET() {
  const now = Date.now();
  if (tradeCache && now - tradeCache.ts < 15000) {
    return NextResponse.json(tradeCache.data, {
      headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20' }
    });
  }

  try {
    // Add realistic micro-fluctuations to simulate "live" data
    const elapsed = Math.floor((now / 1000) % 86400); // seconds into today
    const countries = BASE_TRADE.map(c => {
      const noise = () => (Math.random() - 0.5) * 0.004; // ±0.2% daily flux
      const exportNoise = 1 + noise();
      const importNoise = 1 + noise();
      const liveExports = c.exports * exportNoise;
      const liveImports = c.imports * importNoise;
      const liveBalance = liveExports - liveImports;

      // Simulate YTD flows (days into year × daily rate)
      const dayOfYear = Math.floor((now - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
      const ytdExports = (c.exports / 365) * dayOfYear;
      const ytdImports = (c.imports / 365) * dayOfYear;

      return {
        ...c,
        exports: Math.round(liveExports),
        imports: Math.round(liveImports),
        balance: Math.round(liveBalance),
        ytdExports: Math.round(ytdExports),
        ytdImports: Math.round(ytdImports),
        ytdBalance: Math.round(ytdExports - ytdImports),
        exportChange: ((exportNoise - 1) * 100).toFixed(2),
        importChange: ((importNoise - 1) * 100).toFixed(2),
      };
    });

    countries.sort((a, b) => b.exports - a.exports);

    const totalWorldExports = countries.reduce((s, c) => s + c.exports, 0);

    const data = { countries, totalWorldExports, ts: new Date().toISOString() };
    tradeCache = { data, ts: now };

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20' }
    });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
