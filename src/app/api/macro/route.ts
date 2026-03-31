import { NextResponse } from 'next/server';

const BASE_DATA = {
  gdp: {
    US: 27500000000000, 
    CN: 19500000000000,
    JP: 4300000000000,
    KR: 1800000000000,
    EU: 19000000000000,
  },
  population: {
    WORLD: 8100000000,
    CN: 1409000000,
    US: 340000000,
    KR: 51740000,
  },
  stocks: [
    { name: 'S&P 500', value: 6368.85, change: 1.2 },
    { name: 'KOSPI', value: 5264.32, change: 0.8 },
    { name: 'Nikkei 225', value: 40100.2, change: 0.8 },
    { name: 'Shanghai', value: 3050.5, change: -0.1 },
  ],
  exchangeRates: [
    { pair: 'USD/KRW 🇺🇸', rate: 1512.45, change: 0.54 },
    { pair: 'EUR/KRW 🇪🇺', rate: 1736.1, change: 0.41 },
    { pair: 'JPY/KRW 🇯🇵', rate: 945.9, change: -0.15 },
    { pair: 'CNY/KRW 🇨🇳', rate: 217.1, change: 0.58 },
    { pair: 'GBP/KRW 🇬🇧', rate: 2013.9, change: 2.21 },
    { pair: 'CHF/KRW 🇨🇭', rate: 1901.6, change: 1.46 },
    { pair: 'CAD/KRW 🇨🇦', rate: 1091.8, change: 0.93 },
    { pair: 'AUD/KRW 🇦🇺', rate: 1060.3, change: 1.86 },
  ],
  commodities: [
    { name: '금 (Gold)', value: 4442.2, change: 0.4 },
    { name: '은 (Silver)', value: 78.4, change: 1.2 },
    { name: '구리 (Copper)', value: 12.12, change: -0.3 },
    { name: '브렌트유 (Brent)', value: 102.5, change: 0.6 },
    { name: 'WTI유 (WTI)', value: 102.85, change: 0.8 },
    { name: '천연가스 (Gas)', value: 2.15, change: -1.2 },
  ]
};

const GROWTH_RATES = {
  gdp: { US: 800000, CN: 600000, JP: 130000, KR: 50000, EU: 550000 },
  pop: { WORLD: 2.5, CN: 0.1, US: 0.05, KR: -0.01 }
};

const GLOBAL_EPOCH = new Date('2026-01-01T00:00:00Z').getTime();
let macroCache: { data: any, timestamp: number } | null = null;
const CACHE_TTL = 1000; // 캐시 1초로 단폭 (실시간성 강화)

async function fetchLivePrice(symbol: string, fallback: number) {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`, { 
      cache: 'no-store', // 무조건 최신 데이터 강제
      signal: AbortSignal.timeout(2000)
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    return data.chart.result[0].meta.regularMarketPrice || fallback;
  } catch (e) {
    return fallback;
  }
}

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

    // ──────────────────────────────────────────────────────────────
    // 1. 실시간 가격 시도 (Yahoo Finance)
    const [liveUsdKrw, liveGold, liveWti, liveSpx, liveKospi, liveDxy, liveUs10y, liveBtc, liveEth] = await Promise.all([
      fetchLivePrice('USDKRW=X', 1512.45),
      fetchLivePrice('GC=F', 4442.2),
      fetchLivePrice('CL=F', 102.85),
      fetchLivePrice('^GSPC', 6368.85),
      fetchLivePrice('^KS11', 5264.32),
      fetchLivePrice('DX-Y.NYB', 104.5),
      fetchLivePrice('^TNX', 4.25),
      fetchLivePrice('BTC-USD', 95000),
      fetchLivePrice('ETH-USD', 2800)
    ]);

    // 2. 실시간 '꿈틀거림' 공식 결합
    const t = now / 1000; 
    
    // 한국 10년물 금리 (모사 데이터: 미국 대비 일정한 스프레드 유지)
    const liveKr10y = 3.35 + Math.sin(t * 0.1) * 0.02;
    const yieldSpread = liveUs10y - liveKr10y;
    
    // 지터(Jitter) 추가: 수치가 고정되어 있지 않도록 미세 변동 적용
    const jitter = (v: number) => v + (Math.random() - 0.5) * 0.001;

    const currentStocks = [
      { name: 'S&P 500', value: liveSpx, change: 1.2 },
      { name: 'KOSPI', value: liveKospi, change: 0.8 },
      ...BASE_DATA.stocks.slice(2)
    ].map((s, i) => {
      const wave = Math.sin(t * 0.5 + i) * 0.001; 
      return { ...s, value: parseFloat((s.value * (1 + wave)).toFixed(2)) };
    });
    
    const currentExchange = BASE_DATA.exchangeRates.map((e, i) => {
      const base = e.pair.includes('USD') ? liveUsdKrw : e.rate;
      const wave = Math.sin(t * 0.8 + i) * 0.0008; 
      return { ...e, rate: parseFloat((base * (1 + wave)).toFixed(2)) };
    });
    
    const currentCommodities = [
      { name: '금 (Gold)', value: liveGold, change: 0.4 },
      { name: 'WTI유 (WTI)', value: liveWti, change: 0.8 },
      ...BASE_DATA.commodities.filter(c => !['금 (Gold)', 'WTI유 (WTI)'].includes(c.name))
    ].map((c, i) => {
      const wave = Math.sin(t * 0.3 + i) * 0.0012;
      return { ...c, value: parseFloat((c.value * (1 + wave)).toFixed(2)) };
    });

    const finalData = {
      gdp: currentGDP,
      population: currentPop,
      stocks: currentStocks,
      exchangeRates: currentExchange,
      commodities: currentCommodities,
      macro: {
        dxy: { value: jitter(liveDxy), change: 0.15 },
        us10y: { value: jitter(liveUs10y), change: 0.02 },
        kr10y: { value: jitter(liveKr10y), change: -0.01 },
        yieldSpread: { value: jitter(yieldSpread), change: 0.03 },
        btc: { value: liveBtc + (Math.random() - 0.5) * 2, change: 2.5 },
        eth: { value: liveEth + (Math.random() - 0.5) * 0.5, change: 1.8 },
        dominance: {
          btc: parseFloat((58.42 + Math.sin(t * 0.1) * 0.05).toFixed(2)),
          eth: parseFloat((17.21 + Math.sin(t * 0.15) * 0.03).toFixed(2)),
          usdt: parseFloat((5.24 + Math.sin(t * 0.08) * 0.02).toFixed(2)),
          usdc: parseFloat((1.85 + Math.sin(t * 0.05) * 0.01).toFixed(2))
        },
        yieldCurve: [
          { period: '1M', yield: 5.3 },
          { period: '2Y', yield: 4.6 },
          { period: '10Y', yield: liveUs10y },
          { period: '30Y', yield: 4.4 }
        ]
      },
      timestamp: Date.now()
    };

    macroCache = { data: finalData, timestamp: Date.now() };
    return NextResponse.json(finalData);
  } catch (error) {
    console.error('Macro API Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
