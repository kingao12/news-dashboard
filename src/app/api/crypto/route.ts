import { NextResponse } from 'next/server';

const BASE_CRYPTO = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', basePrice: 65000, marketCap: 1200000000000, image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', basePrice: 3500, marketCap: 400000000000, image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
  { id: 'binance-coin', symbol: 'BNB', name: 'BNB', basePrice: 580, marketCap: 80000000000, image: 'https://assets.coingecko.com/coins/images/825/large/binance-coin-logo.png' },
  { id: 'solana', symbol: 'SOL', name: 'Solana', basePrice: 145, marketCap: 60000000000, image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', basePrice: 0.62, marketCap: 30000000000, image: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', basePrice: 0.45, marketCap: 15000000000, image: 'https://assets.coingecko.com/coins/images/975/large/cardano.png' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', basePrice: 0.15, marketCap: 20000000000, image: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png' }
];

const cryptoCache: Map<string, { data: any, timestamp: number }> = new Map();
const CACHE_TTL = 5000; // 5 seconds for crypto

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reqSymbol = (searchParams.get('symbol') || 'BTC').toUpperCase();
  const interval = searchParams.get('interval') || '1m';
  const cacheKey = `${reqSymbol}-${interval}`;

  const now = Date.now();
  const cached = cryptoCache.get(cacheKey);
  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return NextResponse.json(cached.data, {
      headers: { 'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=5' }
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

    const targetCoin = BASE_CRYPTO.find(c => c.symbol === reqSymbol) || BASE_CRYPTO[0];
    const binanceSymbol = `${targetCoin.symbol}USDT`;
    
    let chartData: any[] = [];
    try {
      const bRes = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=150`);
      if (!bRes.ok) throw new Error('Binance Blocked IP');
      const bData = await bRes.json();
      chartData = bData.map((d: any) => ({
          x: d[0],
          y: [parseFloat(d[1]), parseFloat(d[2]), parseFloat(d[3]), parseFloat(d[4])],
          v: parseFloat(d[5])
        }));
    } catch (e) {
      // Fallback to seeded simulation
      const now = Date.now();
      const roundedNow = Math.floor(now / 5000) * 5000;
      const seed = targetCoin.symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + Math.floor(now / 86400000);
      const walk = getSeededRandom(seed);
      let price = targetCoin.basePrice;
      for (let i = 150; i >= 0; i--) {
        const time = roundedNow - (i * 60000);
        const open = price;
        price += price * 0.001 * (walk() - 0.49);
        chartData.push({ x: time, y: [open, open * 1.001, open * 0.999, price], v: 1000 + walk() * 500 });
      }
    }

    const currentPrice = chartData[chartData.length - 1].y[3];
    const firstPrice = chartData[0].y[0];
    const changePct = ((currentPrice - firstPrice) / firstPrice) * 100;

    const synchronizedRanking = BASE_CRYPTO.map(coin => {
      const isTarget = coin.symbol === targetCoin.symbol;
      return {
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        image: coin.image,
        current_price: isTarget ? currentPrice : coin.basePrice,
        market_cap: coin.marketCap,
        price_change_percentage_24h: isTarget ? changePct : 0.5
      };
    });

    const finalData = {
      chart: {
        symbol: targetCoin.symbol,
        price: currentPrice,
        change: changePct,
        series: chartData,
        image: targetCoin.image
      },
      marketCapList: synchronizedRanking,
      lastUpdated: new Date().toISOString()
    };

    cryptoCache.set(cacheKey, { data: finalData, timestamp: Date.now() });
    return NextResponse.json(finalData);

  } catch (error) {
    console.error('Crypto API Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
