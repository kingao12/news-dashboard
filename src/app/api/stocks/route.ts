import { NextResponse } from 'next/server';

// Static base for top 10 global stocks by Market Cap (trillions)
const BASE_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.', basePrice: 173.50, marketCap: 2680000000000, logo: 'https://logo.clearbit.com/apple.com' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', basePrice: 416.42, marketCap: 3090000000000, logo: 'https://logo.clearbit.com/microsoft.com' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', basePrice: 875.28, marketCap: 2180000000000, logo: 'https://logo.clearbit.com/nvidia.com' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', basePrice: 147.68, marketCap: 1840000000000, logo: 'https://logo.clearbit.com/google.com' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', basePrice: 175.35, marketCap: 1820000000000, logo: 'https://logo.clearbit.com/amazon.com' },
  { symbol: 'META', name: 'Meta Platforms', basePrice: 505.71, marketCap: 1280000000000, logo: 'https://logo.clearbit.com/meta.com' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway', basePrice: 408.31, marketCap: 885000000000, logo: 'https://logo.clearbit.com/berkshirehathaway.com' },
  { symbol: 'LLY', name: 'Eli Lilly & Co.', basePrice: 785.45, marketCap: 745000000000, logo: 'https://logo.clearbit.com/lilly.com' },
  { symbol: 'TSM', name: 'TSMC', basePrice: 139.62, marketCap: 724000000000, logo: 'https://logo.clearbit.com/tsmc.com' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', basePrice: 1308.72, marketCap: 606000000000, logo: 'https://logo.clearbit.com/broadcom.com' },
  { symbol: 'FIGR_HELOC', name: 'Figure Acquisition', basePrice: 10.25, marketCap: 250000000, logo: 'https://logo.clearbit.com/figure.com' }
];

const stocksCache: Map<string, { data: any, timestamp: number }> = new Map();
const CACHE_TTL = 10000; // 10 seconds

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reqSymbol = searchParams.get('symbol') || 'AAPL';
  const interval = searchParams.get('interval') || '1m';
  const cacheKey = `${reqSymbol}-${interval}`;

  const now = Date.now();
  const cached = stocksCache.get(cacheKey);
  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return NextResponse.json(cached.data, {
      headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10' }
    });
  }

  try {
    const getSeededRandom = (seed: number) => {
      let s = seed;
      return () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
    };

    const intervalMap: any = { '1m': 60000, '5m': 300000, '15m': 900000, '1h': 3600000, '4h': 14400000, '1d': 86400000 };
    const stepMs = intervalMap[interval] || 60000;

    const generateStableSeries = (stock: typeof BASE_STOCKS[0], count: number) => {
      const now = Date.now();
      const roundedNow = Math.floor(now / 3000) * 3000;
      const symbolSeed = stock.symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const daySeed = Math.floor(now / 86400000);
      const baseRandom = getSeededRandom(symbolSeed + daySeed);
      let price = stock.basePrice * (0.95 + baseRandom() * 0.1);
      
      const series: any[] = [];
      const walkRandom = getSeededRandom(symbolSeed + daySeed + 100);
      
      for (let i = count; i >= 0; i--) {
        const time = roundedNow - (i * stepMs);
        const open = price;
        const vol = interval === '1m' ? 0.0002 : 0.0008;
        const change = price * vol * (walkRandom() - 0.495);
        price += change;
        const close = price;
        const high = Math.max(open, close) + walkRandom() * (price * 0.0001);
        const low = Math.min(open, close) - walkRandom() * (price * 0.0001);
        
        series.push({
          x: time,
          y: [
            parseFloat(open.toFixed(2)),
            parseFloat(high.toFixed(2)),
            parseFloat(low.toFixed(2)),
            parseFloat(close.toFixed(2))
          ],
          v: Math.floor(walkRandom() * 5000) + 2000
        });
      }

      // 실시간 마이크로 변동 추가 (1분 봉일 때만 적용)
      if (interval === '1m') {
        const microSeed = Math.floor(now / 5000);
        const microWalk = getSeededRandom(symbolSeed + microSeed + 500);
        const jitter = (microWalk() - 0.5) * 0.001 * price;
        series[series.length - 1].y[3] = parseFloat((series[series.length - 1].y[3] + jitter).toFixed(2));
      }

      return series;
    };

    const targetStock = BASE_STOCKS.find(s => s.symbol === reqSymbol) || BASE_STOCKS[0];
    const chartSeries = generateStableSeries(targetStock, 150);
    const lastCandle = chartSeries[chartSeries.length - 1].y;
    const currentPrice = lastCandle[3];
    const firstPrice = chartSeries[0].y[0];
    const changePercentage = ((currentPrice - firstPrice) / firstPrice) * 100;

    const marketCapList = BASE_STOCKS.map(stock => {
      const stockSeries = generateStableSeries(stock, 150);
      const sPrice = stockSeries[stockSeries.length - 1].y[3];
      const sFirst = stockSeries[0].y[0];
      const sChange = ((sPrice - sFirst) / sFirst) * 100;
      
      const finalPrice = stock.symbol === targetStock.symbol ? currentPrice : sPrice;
      const finalChange = stock.symbol === targetStock.symbol ? changePercentage : sChange;

      return {
        id: stock.symbol,
        symbol: stock.symbol,
        name: stock.name,
        image: stock.logo,
        current_price: finalPrice,
        market_cap: stock.marketCap * (finalPrice / stock.basePrice),
        price_change_percentage_24h: finalChange
      };
    }).sort((a, b) => b.market_cap - a.market_cap);

    const finalData = {
      chart: {
        symbol: targetStock.symbol,
        price: currentPrice,
        change: changePercentage,
        series: chartSeries,
        image: targetStock.logo
      },
      marketCapList: marketCapList,
      lastUpdated: new Date().toISOString()
    };

    stocksCache.set(cacheKey, { data: finalData, timestamp: Date.now() });
    return NextResponse.json(finalData);

  } catch (error) {
    console.error('Stocks API Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
