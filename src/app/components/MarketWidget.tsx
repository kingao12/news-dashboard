import { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react';
import useSWR from 'swr';
import styles from './Widget.module.css';
import WidgetSkeleton from './WidgetSkeleton';
import { Coins, LineChart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  { label: '주봉', value: '1w' },
  { label: '월봉', value: '1M' }
];

const SMMA_PERIODS = [7, 15, 25, 50, 100, 200, 400];
const SMMA_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];


declare global {
  interface Window {
    TradingView: any;
  }
}

const TradingViewChart = memo(({ symbol, theme, interval, isCrypto }: { symbol: string, theme: string, interval: string, isCrypto: boolean }) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    
    // 이전 위젯 인스턴스 및 스크립트 완벽 제거 (클린업)
    container.current.innerHTML = '';
    
    const intervalMap: Record<string, string> = {
      '1m': '1', '5m': '5', '15m': '15', '1h': '60', '4h': '240', '1d': 'D', '1w': 'W', '1M': 'M'
    };
    const tvInterval = intervalMap[interval] || '1';
    
    // 현물 심볼 우선 사용으로 로딩 속도 최적화 (필요시 선물로 변경 가능)
    const formattedSymbol = isCrypto ? `BINANCE:${symbol.toUpperCase()}USDT` : (symbol.includes(':') ? symbol : `NASDAQ:${symbol}`);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    
    // 트레이딩뷰 위젯 설정 객체
    const widgetConfig = {
      "autosize": true,
      "symbol": formattedSymbol,
      "interval": tvInterval,
      "timezone": "Asia/Seoul",
      "theme": theme === 'dark' ? 'dark' : 'light',
      "style": "1",
      "locale": "kr",
      "enable_publishing": false,
      "allow_symbol_change": false,
      "calendar": false,
      "support_host": "https://www.tradingview.com",
      "hide_top_toolbar": false,
      "hide_legend": false,
      "save_image": false,
      "container_id": "tv_chart_container",
      "studies": [
        "RSI@tv-basicstudies",
        "MASimple@tv-basicstudies"
      ]
    };

    script.innerHTML = JSON.stringify(widgetConfig);
    container.current.appendChild(script);

    return () => {
      if (container.current) {
        container.current.innerHTML = '';
      }
    };
  }, [symbol, theme, interval, isCrypto]);

  return (
    <div 
      className="tradingview-widget-container" 
      ref={container} 
      style={{ height: '850px', width: '100%', background: '#000' }}
    >
      <div className="tradingview-widget-container__widget" style={{ height: '100%', width: '100%' }}></div>
    </div>
  );
});
TradingViewChart.displayName = 'TradingViewChart';

const LivePrice = ({ basePrice, symbol, className, minWidth = '90px' }: { basePrice: number, symbol: string, className?: string, minWidth?: string }) => {
  const [price, setPrice] = useState(basePrice);
  const [flashClass, setFlashClass] = useState('');
  const prevPrice = useRef(basePrice);

  // 전역 윈도우 객체에 저장된 실시간 가격 구독
  useEffect(() => {
    const handlePriceUpdate = (e: any) => {
      // 대소문자 일치 여부를 위해 통일
      if (typeof e.detail?.symbol === 'string' && e.detail.symbol.toUpperCase() === symbol.toUpperCase()) {
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

const AssetLogo = memo(({ src, symbol, size = 22 }: { src?: string, symbol: string, size?: number }) => {
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
});

AssetLogo.displayName = 'AssetLogo';

export default function MarketWidget() {
  const [activeTab, setActiveTab] = useState<'crypto' | 'stocks'>('crypto');
  const [cryptoSymbol, setCryptoSymbol] = useState('BTC');
  const [stockSymbol, setStockSymbol] = useState('AAPL');
  const [interval, setIntervalVal] = useState('1m');
  const [cryptoRanking, setCryptoRanking] = useState<any[]>([]);
  const [stockRanking, setStockRanking] = useState<any[]>([]);
  
  // Theme awareness for chart colors
  const [isDark, setIsDark] = useState(true);
  
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

  // Binance WebSocket 실시간 가격 스트림 관리 (throttle 적용)
  useEffect(() => {
    if (activeTab !== 'crypto') return;

    let ws: WebSocket | null = null;
    // rAF 기반 삭대로 throttle: 한 프레임에 한 번만 dispatch
    let rafId: number | null = null;
    const batch = new Map<string, number>(); // symbol → latest price

    const flush = () => {
      batch.forEach((price, symbol) => {
        window.dispatchEvent(new CustomEvent('binance-price-update', { detail: { symbol, price } }));
      });
      batch.clear();
      rafId = null;
    };

    const connectWS = () => {
      // 바이낸스 선물(Futures) 가격 스트림으로 연결 (트레이딩뷰 값과 일치)
      ws = new WebSocket('wss://fstream.binance.com/ws/!miniTicker@arr');

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (Array.isArray(data)) {
          data.forEach(ticker => {
            batch.set(ticker.s.replace('USDT', ''), parseFloat(ticker.c));
          });
          // 아직 예약된 rAF가 없으면 등록
          if (rafId === null) rafId = requestAnimationFrame(flush);
        }
      };

      ws.onclose = () => setTimeout(connectWS, 3000);
    };

    connectWS();
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      ws?.close();
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

  const handleTabChange = useCallback((tab: 'crypto' | 'stocks') => {
    setActiveTab(tab);
  }, []);


  const handleRankingClick = useCallback((item: any) => {
    if (activeTab === 'crypto') {
      setCryptoSymbol(item.symbol);
    } else {
      setStockSymbol(item.symbol);
    }
  }, [activeTab]);

  // TradingView 위젯으로 통합되어, 기존 ApexCharts 인디케이터 연산 코드 전체를 제거했습니다.

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
        
      </div>

      <div className={styles.intervalBar}>
        {INTERVALS.map(i => (
          <button key={i.value} onClick={() => setIntervalVal(i.value)} className={`${styles.intervalBtn} ${interval === i.value ? styles.intervalActive : ''}`}>
            {i.label}
          </button>
        ))}
      </div>

      <div className={styles.chartSection} style={{ height: '800px', display: 'flex', flexDirection: 'column' }}>
        {isLoading && !data ? (
          <div style={{ padding: '2rem' }}><WidgetSkeleton /></div>
        ) : error ? (
          <div className={styles.widgetError}>데이터를 불러올 수 없습니다.</div>
        ) : data?.chart ? (
          <>
            <div className={styles.cryptoHeader} style={{ marginBottom: '1rem' }}>
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
            
            <div style={{ height: '850px', width: '100%', position: 'relative' }}>
              <TradingViewChart 
                symbol={activeTab === 'crypto' ? cryptoSymbol : stockSymbol} 
                theme={isDark ? 'dark' : 'light'} 
                interval={interval} 
                isCrypto={activeTab === 'crypto'}
              />
            </div>
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
