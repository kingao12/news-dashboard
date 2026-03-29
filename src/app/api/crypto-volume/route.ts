import { NextResponse } from 'next/server';

// Real Binance 24h ticker API
export async function GET() {
  try {
    // Fetch Binance 24hr tickers for major pairs
    const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT'];
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(SYMBOLS)}`,
      { signal: AbortSignal.timeout(7000) }
    );
    if (!res.ok) throw new Error('Binance API failed');
    const tickers: any[] = await res.json();

    // Binance also provides futures (FAPI)
    let futuresTickers: any[] = [];
    try {
      const futRes = await fetch(`https://fapi.binance.com/fapi/v1/ticker/24hr`, { signal: AbortSignal.timeout(7000) });
      if (futRes.ok) {
        const allFut = await futRes.json();
        futuresTickers = allFut.filter((t: any) => SYMBOLS.includes(t.symbol));
      }
    } catch {}

    const coins = tickers.map((t: any) => {
      const fut = futuresTickers.find((f: any) => f.symbol === t.symbol);
      return {
        symbol: t.symbol.replace('USDT', ''),
        price: parseFloat(t.lastPrice),
        changePercent: parseFloat(t.priceChangePercent),
        // Spot volumes
        spotVolume: parseFloat(t.volume),        // in coin units
        spotQuoteVolume: parseFloat(t.quoteVolume), // in USDT
        // Futures volumes  
        futuresVolume: fut ? parseFloat(fut.volume) : 0,
        futuresQuoteVolume: fut ? parseFloat(fut.quoteVolume) : 0,
        high: parseFloat(t.highPrice),
        low: parseFloat(t.lowPrice),
        openInterest: fut ? (parseFloat(fut.quoteVolume) * 0.08) : 0, // estimate OI
      };
    });

    // Calculate totals
    const totalSpotUSDT = coins.reduce((s, c) => s + c.spotQuoteVolume, 0);
    const totalFuturesUSDT = coins.reduce((s, c) => s + c.futuresQuoteVolume, 0);

    return NextResponse.json({
      coins,
      summary: {
        totalSpotVolume: totalSpotUSDT,
        totalFuturesVolume: totalFuturesUSDT,
        totalCombinedVolume: totalSpotUSDT + totalFuturesUSDT,
      }
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20' }
    });
  } catch (error) {
    console.error('CryptoVolume API Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
