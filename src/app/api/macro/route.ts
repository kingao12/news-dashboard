import { NextResponse } from 'next/server';

const BASE_DATA = {
  gdp: {
    US: 26000000000000, 
    CN: 19000000000000,
    JP: 4200000000000,
    KR: 1700000000000,
    EU: 18000000000000,
  },
  population: {
    WORLD: 8100000000,
    CN: 1409000000,
    US: 339000000,
    KR: 51000000,
  },
  stocks: [
    { name: 'S&P 500', value: 5123.41, change: 1.2 },
    { name: 'KOSPI', value: 2750.12, change: -0.5 },
    { name: 'Nikkei', value: 40100.2, change: 0.8 },
    { name: 'Shanghai', value: 3050.5, change: -0.1 },
  ],
  exchangeRates: [
    { pair: 'USD/KRW 🇺🇸', rate: 1503.5, change: 0.54 },
    { pair: 'EUR/KRW 🇪🇺', rate: 1736.1, change: 0.41 },
    { pair: 'JPY/KRW 🇯🇵', rate: 945.9, change: -0.15 },
    { pair: 'CNY/KRW 🇨🇳', rate: 217.1, change: 0.58 },
    { pair: 'GBP/KRW 🇬🇧', rate: 2013.9, change: 2.21 },
    { pair: 'CHF/KRW 🇨🇭', rate: 1901.6, change: 1.46 },
    { pair: 'CAD/KRW 🇨🇦', rate: 1091.8, change: 0.93 },
    { pair: 'AUD/KRW 🇦🇺', rate: 1060.3, change: 1.86 },
  ],
  commodities: [
    { name: '금 (Gold)', value: 2350.2, change: 0.4 },
    { name: '은 (Silver)', value: 28.4, change: 1.2 },
    { name: '구리 (Copper)', value: 4.12, change: -0.3 },
    { name: '백금 (Platinum)', value: 950.5, change: -0.1 },
    { name: '브렌트유 (Brent)', value: 85.5, change: 0.6 },
    { name: 'WTI유 (WTI)', value: 81.2, change: 0.8 },
    { name: '천연가스 (Nat Gas)', value: 1.95, change: -1.2 },
  ]
};

const GROWTH_RATES = {
  gdp: { US: 800000, CN: 600000, JP: 130000, KR: 50000, EU: 550000 },
  pop: { WORLD: 2.5, CN: 0.1, US: 0.05, KR: -0.01 }
};

const GLOBAL_EPOCH = new Date('2026-01-01T00:00:00Z').getTime();
let macroCache: { data: any, timestamp: number } | null = null;
const CACHE_TTL = 2000; // 실시간성을 위해 2초로 단축

export async function GET() {
  const now = Date.now();
  if (macroCache && (now - macroCache.timestamp < CACHE_TTL)) {
    return NextResponse.json(macroCache.data, {
      headers: { 'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=5' }
    });
  }

  try {
    const elapsedSeconds = Math.floor((now - GLOBAL_EPOCH) / 1000);

    const baseGDP = {
      US: 27500000000000,
      CN: 19500000000000,
      JP: 4300000000000,
      KR: 1800000000000,
      EU: 19000000000000,
    };
    
    const basePop = {
      WORLD: 8083000000,
      CN: 1409000000,
      US: 340000000,
      KR: 51700000,
    };

    const currentGDP = {
      US: baseGDP.US + (GROWTH_RATES.gdp.US * elapsedSeconds),
      CN: baseGDP.CN + (GROWTH_RATES.gdp.CN * elapsedSeconds),
      JP: baseGDP.JP + (GROWTH_RATES.gdp.JP * elapsedSeconds),
      KR: baseGDP.KR + (GROWTH_RATES.gdp.KR * elapsedSeconds),
      EU: baseGDP.EU + (GROWTH_RATES.gdp.EU * elapsedSeconds),
    };

    const currentPop = {
      WORLD: Math.floor(basePop.WORLD + (GROWTH_RATES.pop.WORLD * elapsedSeconds)),
      CN: Math.floor(basePop.CN + (GROWTH_RATES.pop.CN * elapsedSeconds)),
      US: Math.floor(basePop.US + (GROWTH_RATES.pop.US * elapsedSeconds)),
      KR: Math.floor(basePop.KR + (GROWTH_RATES.pop.KR * elapsedSeconds)),
    };

    const noise = () => (Math.random() - 0.5) * 0.01;
    
    // ──────────────────────────────────────────────────────────────
    // 실시간 '꿈틀거림' 공식: (기본값) * (1 + sin(초 * 계수) * 변동폭)
    const t = now / 1000; // 현재 초 단위
    
    const currentStocks = BASE_DATA.stocks.map((s, i) => {
      const wave = Math.sin(t * 0.5 + i) * 0.002;
      return { ...s, value: parseFloat((s.value * (1 + wave)).toFixed(2)) };
    });
    
    const currentExchange = BASE_DATA.exchangeRates.map((e, i) => {
      // 5초 주기로 미세하게 위아래로 움직임
      const wave = Math.sin(t * 0.8 + i) * 0.0015; 
      const rate = e.rate * (1 + wave);
      return { ...e, rate: parseFloat(rate.toFixed(2)) };
    });
    
    const currentCommodities = BASE_DATA.commodities.map((c, i) => {
      const wave = Math.sin(t * 0.3 + i) * 0.003;
      return { ...c, value: parseFloat((c.value * (1 + wave)).toFixed(2)) };
    });

    const finalData = {
      gdp: currentGDP,
      population: currentPop,
      stocks: currentStocks,
      exchangeRates: currentExchange,
      commodities: currentCommodities,
      timestamp: Date.now()
    };

    macroCache = { data: finalData, timestamp: Date.now() };
    return NextResponse.json(finalData);
  } catch (error) {
    console.error('Macro API Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
