import { useState, useEffect, useMemo, useRef } from 'react';
import useSWR from 'swr';
import styles from './Widget.module.css';
import WidgetSkeleton from './WidgetSkeleton';
import { TrendingUp, TrendingDown, Coins, LineChart, Activity, RefreshCcw, Settings, Eye, EyeOff } from 'lucide-react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateSMMA, calculateRSI, calculateVWMA } from '../utils/indicators';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });
const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error('API Error');
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return d;
};

const INTERVALS = [
  { label: '1분', value: '1m' },
  { label: '5분', value: '5m' },
  { label: '15분', value: '15m' },
  { label: '1시간', value: '1h' },
  { label: '4시간', value: '4h' },
  { label: '일봉', value: '1d' },
  { label: '주봉', value: '1w' }
];

const SMMA_PERIODS = [7, 15, 25, 50, 100, 200, 400];
const SMMA_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

const LivePrice = ({ basePrice, symbol, className, minWidth = '90px' }: { basePrice: number, symbol: string, className?: string, minWidth?: string }) => {
  const [price, setPrice] = useState(basePrice);
  const [flashClass, setFlashClass] = useState('');
  const prevPrice = useRef(basePrice);

  // 전역 윈도우 객체에 저장된 실시간 가격 구독
  useEffect(() => {
    const handlePriceUpdate = (e: any) => {
      if (e.detail.symbol === symbol) {
        const newPrice = e.detail.price;
        if (newPrice > prevPrice.current) setFlashClass('price-flash-up');
        else if (newPrice < prevPrice.current) setFlashClass('price-flash-down');
        
        setPrice(newPrice);
        prevPrice.current = newPrice;
        
        const timeout = setTimeout(() => setFlashClass(''), 800);
        return () => clearTimeout(timeout);
      }
    };

    window.addEventListener('binance-price-update', handlePriceUpdate);
    return () => window.removeEventListener('binance-price-update', handlePriceUpdate);
  }, [symbol]);

  // basePrice 변경 시 (서버 데이터 갱신) 동기화
  useEffect(() => {
    if (Math.abs(basePrice - price) / basePrice > 0.01) { // 1% 이상 차이 시에만 강제 동기화 (WS가 우선)
      setPrice(basePrice);
      prevPrice.current = basePrice;
    }
  }, [basePrice]);

  return (
    <span className={`${className} ${flashClass} terminal-text`} style={{ 
      display: 'inline-block', 
      minWidth: minWidth,
      textAlign: 'right',
      flexShrink: 0,
      transition: 'color 0.4s ease'
    }}>
      ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
};

const AssetLogo = ({ src, symbol, size = 22 }: { src?: string, symbol: string, size?: number }) => {
  const [error, setError] = useState(false);
  
  if (!src || error) {
    return (
      <div style={{ 
        width: size, 
        height: size, 
        borderRadius: '50%', 
        background: 'rgba(255,255,255,0.1)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        fontSize: size * 0.45,
        fontWeight: 600,
        color: '#94a3b8'
      }}>
        {symbol[0]}
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt="" 
      onError={() => setError(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'contain', background: '#fff' }} 
    />
  );
};

export default function MarketWidget() {
  const [activeTab, setActiveTab] = useState<'crypto' | 'stocks'>('crypto');
  const [cryptoSymbol, setCryptoSymbol] = useState('BTC');
  const [stockSymbol, setStockSymbol] = useState('S&P 500 Index');
  const [interval, setIntervalVal] = useState('1m');
  const [cryptoRanking, setCryptoRanking] = useState<any[]>([]);
  const [stockRanking, setStockRanking] = useState<any[]>([]);
  
  // Indicator Visibility
  const [showRSI, setShowRSI] = useState(true);
  const [showVWMA, setShowVWMA] = useState(true);
  const [visibleSMMAs, setVisibleSMMAs] = useState<Set<number>>(new Set([7, 25, 100]));
  // Theme awareness for chart colors
  const [isDark, setIsDark] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-theme') !== 'light');
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const cryptoEndpoint = `/api/crypto?symbol=${cryptoSymbol}&interval=${interval}`;
  const stockEndpoint = `/api/stocks?symbol=${stockSymbol}&interval=${interval}`;
    
  const { data: cryptoData, error: cryptoError, isLoading: cryptoLoading } = useSWR(cryptoEndpoint, fetcher, { 
    keepPreviousData: true,
    revalidateOnFocus: false,
    refreshInterval: activeTab === 'crypto' && interval === '1m' ? 3000 : 30000 
  });

  const { data: stockData, error: stockError, isLoading: stockLoading } = useSWR(stockEndpoint, fetcher, { 
    keepPreviousData: true,
    revalidateOnFocus: false,
    refreshInterval: activeTab === 'stocks' && interval === '1m' ? 3000 : 30000 
  });

  // Binance WebSocket 실시간 가격 스트림 관리
  useEffect(() => {
    if (activeTab !== 'crypto') return;

    let ws: WebSocket | null = null;
    const connectWS = () => {
      ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (Array.isArray(data)) {
          data.forEach(ticker => {
            const symbol = ticker.s.replace('USDT', '');
            const price = parseFloat(ticker.c);
            
            // 전역 이벤트 발행 (LivePrice 컴포넌트들이 구독)
            window.dispatchEvent(new CustomEvent('binance-price-update', { 
              detail: { symbol, price } 
            }));
          });
        }
      };

      ws.onclose = () => {
        setTimeout(connectWS, 3000);
      };
    };

    connectWS();
    return () => {
      if (ws) ws.close();
    };
  }, [activeTab]);

  useEffect(() => {
    if (cryptoData?.marketCapList) {
      setCryptoRanking(cryptoData.marketCapList);
    }
  }, [cryptoData]);

  useEffect(() => {
    if (stockData?.marketCapList) {
      setStockRanking(stockData.marketCapList);
    }
  }, [stockData]);

  const data = activeTab === 'crypto' ? cryptoData : stockData;
  const isLoading = activeTab === 'crypto' ? cryptoLoading : stockLoading;
  const error = activeTab === 'crypto' ? cryptoError : stockError;

  const handleTabChange = (tab: 'crypto' | 'stocks') => {
    setActiveTab(tab);
  };

  const toggleSMMA = (p: number) => {
    const next = new Set(visibleSMMAs);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setVisibleSMMAs(next);
  };

  const handleRankingClick = (item: any) => {
    if (activeTab === 'crypto') {
      setCryptoSymbol(item.symbol);
    } else {
      setStockSymbol(item.symbol);
    }
  };

  // 1. Calculate Indicators with robust null-checks
  const { ohlcSeries, indicatorSeries, rsiSeries } = useMemo(() => {
    if (!data?.chart?.series || !Array.isArray(data.chart.series)) {
      return { ohlcSeries: [], indicatorSeries: [], rsiSeries: [] };
    }
    
    const raw = data.chart.series;
    const closes = raw.map((d: any) => d.y[3]);
    const volumes = raw.map((d: any) => typeof d.v === 'number' ? d.v : 0);

    // Candlestick series (last 60 for focus)
    const displaySlice = raw.slice(-60);
    const ohlc = displaySlice.map((d: any) => ({ x: d.x, y: Array.isArray(d.y) ? d.y : [0,0,0,0] }));

    // Sync last candle with jittered price
    if (ohlc.length > 0 && typeof data?.chart?.price === 'number' && interval === '1m') {
      const live = data.chart.price;
      const lastItem = {...ohlc[ohlc.length - 1]};
      const lastY = [...lastItem.y];
      lastY[3] = live;
      if (live > lastY[1]) lastY[1] = live;
      if (live < lastY[2]) lastY[2] = live;
      lastItem.y = lastY;
      ohlc[ohlc.length - 1] = lastItem;
    }

    const indicators: any[] = [];
    
    // VWMAs
    if (showVWMA && raw.length > 100) {
      const vwmals = calculateVWMA(closes, volumes, 100);
      indicators.push({
        name: 'VWMA 100',
        type: 'line',
        data: displaySlice.map((d: any) => {
          const idx = raw.indexOf(d);
          return { x: d.x, y: vwmals[idx] ?? null };
        }),
        color: '#f43f5e'
      });
    }

    // SMMAs
    SMMA_PERIODS.forEach((p, idx) => {
      if (visibleSMMAs.has(p) && raw.length > p) {
        const smmals = calculateSMMA(closes, p);
        indicators.push({
          name: `SMMA ${p}`,
          type: 'line',
          data: displaySlice.map((d: any) => {
            const ridx = raw.indexOf(d);
            return { x: d.x, y: smmals[ridx] ?? null };
          }),
          color: SMMA_COLORS[idx]
        });
      }
    });

    // RSI
    const rsils = calculateRSI(closes, 14);
    const rsi = displaySlice.map((d: any) => {
      const ridx = raw.indexOf(d);
      return { x: d.x, y: rsils[ridx] ?? null };
    });

    return { ohlcSeries: ohlc, indicatorSeries: indicators, rsiSeries: rsi };
  }, [data, visibleSMMAs, showVWMA, interval]);

  const mainChartOptions: any = useMemo(() => ({
    chart: {
      id: 'main-chart',
      type: 'line', 
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: false }
    },
    stroke: { width: [0, ...Array(indicatorSeries.length).fill(2)] }, 
    xaxis: { type: 'datetime', labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: {
      labels: { 
        style: { colors: isDark ? '#94a3b8' : '#475569' }, 
        formatter: (v: number | null | undefined) => v != null ? `$${v.toLocaleString()}` : '' 
      },
      opposite: true
    },
    grid: { borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)', strokeDashArray: 4 },
    legend: { labels: { colors: isDark ? '#f8fafc' : '#0f172a' } },
    tooltip: { 
      theme: isDark ? 'dark' : 'light', 
      shared: true 
    },
    plotOptions: {
      candlestick: {
        colors: { upward: '#22c55e', downward: '#ef4444' },
        wick: { useFillColor: true }
      }
    }
  }), [indicatorSeries.length, isDark]);

  const rsiChartOptions: any = useMemo(() => ({
    chart: { id: 'rsi-chart', type: 'line', background: 'transparent', toolbar: { show: false }, sparkline: { enabled: false } },
    stroke: { curve: 'smooth', width: 2 },
    colors: ['#8b5cf6'],
    xaxis: { type: 'datetime', labels: { show: false }, axisBorder: { show: false } },
    yaxis: { 
      min: 0, max: 100, tickAmount: 2, 
      labels: { 
        style: { colors: isDark ? '#94a3b8' : '#475569' }, 
        formatter: (v: number | null | undefined) => v != null ? v.toFixed(0) : '' 
      } 
    },
    grid: { show: false },
    legend: { labels: { colors: isDark ? '#f8fafc' : '#0f172a' } },
    annotations: {
      yaxis: [
        { y: 70, borderColor: '#ef4444', label: { text: '70', style: { color: '#ef4444', background: 'transparent' } } },
        { y: 30, borderColor: '#22c55e', label: { text: '30', style: { color: '#22c55e', background: 'transparent' } } }
      ]
    },
    tooltip: { 
      theme: isDark ? 'dark' : 'light',
      shared: false
    }
  }), [isDark]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={styles.widgetPanel}
    >
      <div className={styles.tabContainer}>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button onClick={() => handleTabChange('crypto')} className={`${styles.tabButton} ${activeTab === 'crypto' ? styles.tabButtonActive : ''}`}>
            <Coins size={14} /> 코인
          </button>
          <button onClick={() => handleTabChange('stocks')} className={`${styles.tabButton} ${activeTab === 'stocks' ? styles.tabButtonActive : ''}`}>
            <LineChart size={14} /> 주식
          </button>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} className={styles.settingsBtn}>
          <Settings size={16} />
        </button>
      </div>

      <div className={styles.intervalBar}>
        {INTERVALS.map(i => (
          <button key={i.value} onClick={() => setIntervalVal(i.value)} className={`${styles.intervalBtn} ${interval === i.value ? styles.intervalActive : ''}`}>
            {i.label}
          </button>
        ))}
      </div>

      {showSettings && (
        <div className={styles.settingsOverlay}>
          <div className={styles.settingGroup}>
            <span>지표 표시</span>
            <div className={styles.toggleRow}>
              <button onClick={() => setShowRSI(!showRSI)} className={showRSI ? styles.toggleOn : ''}>RSI</button>
              <button onClick={() => setShowVWMA(!showVWMA)} className={showVWMA ? styles.toggleOn : ''}>VWMA</button>
            </div>
          </div>
          <div className={styles.settingGroup}>
            <span>이동평균선 (SMMA)</span>
            <div className={styles.smmaRow}>
              {SMMA_PERIODS.map(p => (
                <button key={p} onClick={() => toggleSMMA(p)} className={visibleSMMAs.has(p) ? styles.toggleOn : ''}>{p}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={styles.chartSection} style={{ minHeight: showRSI ? '550px' : '380px' }}>
        {isLoading && !data ? (
          <div style={{ padding: '2rem' }}><WidgetSkeleton /></div>
        ) : error ? (
          <div className={styles.widgetError}>데이터를 불러올 수 없습니다.</div>
        ) : data?.chart ? (
          <>
            <div className={styles.cryptoHeader}>
              <div className={styles.cryptoPrice}>
                <AssetLogo src={data.chart.image} symbol={data.chart.symbol} size={28} />
                <span className={styles.symbol} style={{ fontSize: '1rem', marginLeft: '0.6rem' }}>{data.chart.symbol} ({interval})</span>
                <span className={styles.price} style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <LivePrice basePrice={data.chart.price} symbol={data.chart.symbol} minWidth="220px" />
                </span>
              </div>
              <div className={`${styles.cryptoChangeBadge} ${data.chart.change >= 0 ? styles.plusBg : styles.minusBg}`} style={{ padding: '0.5rem 1rem', fontSize: '0.95rem' }}>
                <div className={styles.livePulse} style={{ width: '8px', height: '8px', backgroundColor: data.chart.change >= 0 ? '#22c55e' : '#ef4444' }} />
                {data.chart.change.toFixed(2)}%
              </div>
            </div>
            
            {typeof window !== 'undefined' && (
              <Chart 
                options={mainChartOptions} 
                series={[{ name: 'Price', type: 'candlestick', data: ohlcSeries }, ...indicatorSeries]} 
                height={350} 
              />
            )}
            
            {(showRSI && typeof window !== 'undefined') && (
              <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 800, marginBottom: '8px', letterSpacing: '0.05em' }}>RELATIVE STRENGTH INDEX (14)</div>
                <Chart options={rsiChartOptions} series={[{ name: 'RSI', data: rsiSeries }]} type="line" height={150} />
              </div>
            )}
          </>
        ) : (
          <div className={styles.widgetError}>데이터가 존재하지 않습니다.</div>
        )}
      </div>

      <div className={styles.rankingList}>
        {(activeTab === 'crypto' ? cryptoRanking : stockRanking).map((item: any, idx: number) => (
          <div key={item.id} className={styles.rankingItem} onClick={() => handleRankingClick(item)}>
            <div className={styles.rankInfo}>
              <span className={styles.rankIndex}>{idx + 1}</span>
              <AssetLogo src={item.image} symbol={item.symbol} size={22} />
              <span className={styles.rankSymbol}>{item.symbol}</span>
            </div>
            <div className={styles.rankPriceCol}>
              <div className={styles.rankPrice}>
                <LivePrice basePrice={item.current_price} symbol={item.symbol} />
              </div>
            </div>
          </div>
        ))}
        {(activeTab === 'crypto' ? cryptoRanking : stockRanking).length === 0 && !isLoading && (
          <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
             리스트를 불러올 수 없습니다.
          </div>
        )}
      </div>
    </motion.div>
  );
}
