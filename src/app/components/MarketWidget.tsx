'use client';

import { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import styles from './Widget.module.css';
import WidgetSkeleton from './WidgetSkeleton';
import { Coins, LineChart, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatKoreanCurrency, formatKRW, formatKoreanNumber, formatPercent } from '@/utils/formatters';
import { MarketData, MarketAsset } from '@/types';

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
  { label: '일봉', value: '1d' }
];

const CHART_STYLES = [
  { label: '캔들', value: '1' },
  { label: '라인', value: '2' },
  { label: '영역', value: '3' },
  { label: '바', value: '0' }
];

const CHART_HEIGHT = 580; // 차트 시인성을 위해 대폭 상향 조정

const TradingViewChart = memo(
  ({
    symbol,
    theme,
    interval,
    isCrypto,
    chartStyle
  }: {
    symbol: string;
    theme: string;
    interval: string;
    isCrypto: boolean;
    chartStyle: string;
  }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!containerRef.current) return;

      // 기존 차트 정리
      containerRef.current.innerHTML = '';

      const intervalMap: Record<string, string> = {
        '1m': '1', '5m': '5', '15m': '15', '1h': '60', '1d': 'D'
      };

      const tvInterval = intervalMap[interval] || '1';
      
      // 심볼 포맷 표준화
      let formattedSymbol = symbol;
      if (isCrypto) {
        // BTC -> BINANCE:BTCUSDT
        const cleanSym = symbol.replace('USDT', '').toUpperCase();
        formattedSymbol = `BINANCE:${cleanSym}USDT`;
      } else if (!symbol.includes(':')) {
        // AAPL -> NASDAQ:AAPL
        formattedSymbol = `NASDAQ:${symbol.toUpperCase()}`;
      }

      const widgetId = `tv_chart_${Math.random().toString(36).substr(2, 9)}`;
      const widgetDiv = document.createElement('div');
      widgetDiv.id = widgetId;
      widgetDiv.style.width = '100%';
      widgetDiv.style.height = '100%';
      containerRef.current.appendChild(widgetDiv);

      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.type = 'text/javascript';
      script.async = true;

      const widgetConfig = {
        autosize: true,
        symbol: formattedSymbol,
        interval: tvInterval,
        timezone: 'Asia/Seoul',
        theme: theme === 'dark' ? 'dark' : 'light',
        style: chartStyle,
        locale: 'kr',
        enable_publishing: false,
        hide_top_toolbar: true,
        allow_symbol_change: false,
        container_id: widgetId,
        save_image: false,
        backgroundColor: theme === 'dark' ? 'rgba(13, 17, 23, 1)' : 'rgba(255, 255, 255, 1)',
        gridColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
        width: "100%",
        height: "100%",
      };

      script.innerHTML = JSON.stringify(widgetConfig);
      containerRef.current.appendChild(script);

      // 리사이즈 강제 트리거 (일부 브라우저 초기 높이 0px 이슈 방지)
      const resizeObserver = new ResizeObserver(() => {
        if (containerRef.current && containerRef.current.offsetHeight > 0) {
          // 필요 시 내부 iframe 리사이즈 로직 추가 가능
        }
      });
      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
        if (containerRef.current) containerRef.current.innerHTML = '';
      };
    }, [symbol, theme, interval, isCrypto, chartStyle]);

    return (
      <div
        ref={containerRef}
        className="tradingview-widget-container"
        style={{
          width: '100%',
          height: `${CHART_HEIGHT}px`,
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--bg-secondary)',
          borderRadius: '12px'
        }}
      >
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--text-secondary)', fontSize: '0.8rem', zIndex: 0 }}>
          차트 초기화 중...
        </div>
      </div>
    );
  }
);

TradingViewChart.displayName = 'TradingViewChart';

const LivePrice = ({
  basePrice,
  symbol,
  currency = '$',
  usdKrw = 1,
  showDual = false
}: {
  basePrice: number;
  symbol: string;
  currency?: string;
  usdKrw?: number;
  showDual?: boolean;
}) => {
  const [price, setPrice] = useState(basePrice);
  const [flashClass, setFlashClass] = useState('');
  const [isLive, setIsLive] = useState(false);
  const prevPrice = useRef(basePrice);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // 1. Binance WebSocket 연결 (가상자산인 경우)
    if (symbol && !symbol.includes(':')) { // 가상자산은 보통 symbol만 전달됨 (예: BTC)
      const cleanSymbol = symbol.toLowerCase().replace('usdt', '');
      const wsUrl = `wss://stream.binance.com:9443/ws/${cleanSymbol}usdt@ticker`;
      
      if (wsRef.current) wsRef.current.close();
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setIsLive(true);
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const newPrice = parseFloat(data.c);
        if (newPrice !== prevPrice.current) {
          // Dispatch event for other listeners (like the ranking list)
          window.dispatchEvent(new CustomEvent('market-asset-price-update', { 
            detail: { symbol: symbol.toUpperCase(), price: newPrice } 
          }));
          
          setFlashClass(newPrice > prevPrice.current ? 'price-flash-up' : 'price-flash-down');
          setPrice(newPrice);
          prevPrice.current = newPrice;
          setTimeout(() => setFlashClass(''), 800);
        }
      };
      
      ws.onclose = () => setIsLive(false);
      ws.onerror = () => setIsLive(false);

      return () => ws.close();
    }
    
    // 2. 비가상자산의 경우 기존 브로드캐스트 이벤트 구독 유지
    const handlePriceUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (typeof customEvent.detail?.symbol === 'string' && customEvent.detail.symbol.toUpperCase() === symbol.toUpperCase()) {
        const newPrice = customEvent.detail.price;
        if (newPrice > prevPrice.current) setFlashClass('price-flash-up');
        else if (newPrice < prevPrice.current) setFlashClass('price-flash-down');
        setPrice(newPrice);
        prevPrice.current = newPrice;
        setTimeout(() => setFlashClass(''), 800);
      }
    };
    window.addEventListener('binance-price-update', handlePriceUpdate as EventListener);
    return () => window.removeEventListener('binance-price-update', handlePriceUpdate as EventListener);
  }, [symbol]);

  useEffect(() => {
    // SWR 데이터 갱신 시 보정
    if (basePrice > 0 && Math.abs(basePrice - price) / basePrice > 0.05) {
      setPrice(basePrice);
      prevPrice.current = basePrice;
    }
  }, [basePrice]);

  const primaryPrice = currency === '$' 
    ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` 
    : formatKRW(price);
  
  const secondaryPrice = showDual && currency === '$' 
    ? formatKRW(Math.floor(price * usdKrw)) 
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {isLive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '1px 5px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '4px' }}>
            <span style={{ width: '4px', height: '4px', background: '#22c55e', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: '0.6rem', color: '#22c55e', fontWeight: 900 }}>LIVE</span>
          </div>
        )}
        <span className={`${flashClass} tabular-nums`} style={{ fontSize: '1.4rem', fontWeight: 1000, transition: 'color 0.4s ease' }}>
          {primaryPrice}
        </span>
      </div>
      {secondaryPrice && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
          {secondaryPrice}
        </span>
      )}
    </div>
  );
};

const AssetLogo = memo(({ src, symbol, size = 22 }: { src?: string; symbol: string; size?: number }) => {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.45, fontWeight: 800, color: 'var(--text-secondary)', border: '1px solid var(--border-glass)' }}>
        {symbol[0]}
      </div>
    );
  }
  return (
    <img src={src} alt="" onError={() => setError(true)} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'contain', background: '#fff', border: '1px solid var(--border-glass)' }} />
  );
});

AssetLogo.displayName = 'AssetLogo';

const RankingLivePrice = memo(({ basePrice, symbol, currency = '$', usdKrw = 1 }: { 
  basePrice: number; 
  symbol: string; 
  currency?: string; 
  usdKrw?: number;
}) => {
  const [price, setPrice] = useState(basePrice);
  const [flashClass, setFlashClass] = useState('');
  const prevPrice = useRef(basePrice);

  useEffect(() => {
    const handler = (e: Event) => {
      const customE = e as CustomEvent;
      if (customE.detail?.symbol === symbol.toUpperCase()) {
        const newPrice = customE.detail.price;
        if (newPrice > prevPrice.current) setFlashClass('price-flash-up');
        else if (newPrice < prevPrice.current) setFlashClass('price-flash-down');
        setPrice(newPrice);
        prevPrice.current = newPrice;
        setTimeout(() => setFlashClass(''), 800);
      }
    };
    window.addEventListener('market-asset-price-update', handler);
    return () => window.removeEventListener('market-asset-price-update', handler);
  }, [symbol]);

  useEffect(() => {
    if (basePrice !== price && Math.abs(basePrice - price) / basePrice > 0.05) {
      setPrice(basePrice);
      prevPrice.current = basePrice;
    }
  }, [basePrice]);

  return (
    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
      <span className={`${flashClass} tabular-nums`} style={{ fontSize: '0.85rem', fontWeight: 900, transition: 'color 0.4s ease' }}>
        {currency === '$' ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : formatKRW(price)}
      </span>
      {currency === '$' && (
        <span className="tabular-nums" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
          {formatKRW(Math.floor(price * usdKrw))}
        </span>
      )}
    </div>
  );
});

RankingLivePrice.displayName = 'RankingLivePrice';

// --- Sparkline Component (Trend Line) ---
const Sparkline = memo(({ change, width = 60, height = 24 }: { change: number; width?: number; height?: number }) => {
  const isUp = change >= 0;
  const color = isUp ? '#10b981' : '#f43f5e';
  
  // 가상의 트렌드 포인트 생성 (실제 데이터 없을 때 시각적 효과용)
  const points = useMemo(() => {
    const pts = [0.5];
    const step = 6;
    let last = 0.5;
    for (let i = 0; i < step; i++) {
      const rand = (Math.random() - 0.5) * 0.3;
      const trend = isUp ? 0.05 : -0.05;
      last = Math.max(0.1, Math.min(0.9, last + rand + trend));
      pts.push(last);
    }
    return pts;
  }, [isUp]);

  const path = points.map((p, i) => `${(i / (points.length - 1)) * width},${height - p * height}`).join(' L ');

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${isUp}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M 0,${height - points[0] * height} L ${path}`}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={`M 0,${height - points[0] * height} L ${path} L ${width},${height} L 0,${height} Z`}
        fill={`url(#grad-${isUp})`}
        stroke="none"
      />
    </svg>
  );
});

Sparkline.displayName = 'Sparkline';

export default function MarketWidget() {
  const [activeTab, setActiveTab] = useState<'crypto' | 'domestic' | 'overseas'>('crypto');
  const [cryptoSymbol, setCryptoSymbol] = useState('BTC');
  const [domesticSymbol, setDomesticSymbol] = useState('005930');
  const [overseasSymbol, setOverseasSymbol] = useState('AAPL');
  const [interval, setIntervalVal] = useState('1m');
  const [chartStyle, setChartStyle] = useState('1');
  const [isDark, setIsDark] = useState(true);

  const { data: macroData } = useSWR<{ exchangeRates: { pair: string, rate: number }[] }>('/api/macro', fetcher);
  const usdKrw = macroData?.exchangeRates?.find((e) => e.pair.includes('USD/KRW'))?.rate || 1400;

  // --- 외부 연동 리스너 (Money Flow -> Market Chart) ---
  useEffect(() => {
    const handleSymbolChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { symbol, category } = customEvent.detail;
      if (!symbol) return;

      // 카테고리별 매핑 로직
      if (category === 'CRYPTO') {
        setActiveTab('crypto');
        setCryptoSymbol(symbol === 'EXCHANGE' ? 'BTC' : symbol);
      } else if (category === 'REGION') {
        if (symbol === 'KR') {
          setActiveTab('domestic');
          setDomesticSymbol('005930');
        } else if (symbol === 'US') {
          setActiveTab('overseas');
          setOverseasSymbol('QQQ');
        } else if (symbol === 'JP') {
          setActiveTab('overseas');
          setOverseasSymbol('7203'); // Toyota on some providers or just SPY for fallback
        } else {
          setActiveTab('overseas');
          setOverseasSymbol('SPY');
        }
      } else if (category === 'SECTOR') {
        setActiveTab('overseas');
        if (symbol === 'NVDA') setOverseasSymbol('NVDA');
        else if (symbol === 'BANK') setOverseasSymbol('XLF');
        else if (symbol === 'ENERGY') setOverseasSymbol('XLE');
        else setOverseasSymbol('SPY');
      } else {
        // ASSET, STYLE, BOND 등
        setActiveTab('overseas');
        if (symbol === 'EQUITY') setOverseasSymbol('SPY');
        else if (symbol === 'BOND') setOverseasSymbol('TLT');
        else if (symbol === 'GOLD') setOverseasSymbol('GLD');
        else setOverseasSymbol('SPY');
      }
    };

    window.addEventListener('change-market-symbol', handleSymbolChange);
    return () => window.removeEventListener('change-market-symbol', handleSymbolChange);
  }, []);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-theme') !== 'light');
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const endpoint = activeTab === 'crypto' 
    ? `/api/crypto?symbol=${cryptoSymbol}&interval=${interval}` 
    : activeTab === 'domestic' 
      ? `/api/stocks?symbol=${domesticSymbol}&interval=${interval}&market=kr`
      : `/api/stocks?symbol=${overseasSymbol}&interval=${interval}&market=us`;

  const { data, error, isLoading } = useSWR<MarketData>(endpoint, fetcher, {
    keepPreviousData: true,
    refreshInterval: 3000
  });

  const handleRankingClick = useCallback((item: MarketAsset) => {
    if (activeTab === 'crypto') setCryptoSymbol(item.symbol);
    else if (activeTab === 'domestic') setDomesticSymbol(item.symbol);
    else setOverseasSymbol(item.symbol);
  }, [activeTab]);

  const getCurrentSymbol = () => {
    if (activeTab === 'crypto') return cryptoSymbol;
    if (activeTab === 'domestic') return `KRX:${domesticSymbol}`;
    return `NASDAQ:${overseasSymbol}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-panel"
      style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1rem' }}
    >
      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {(['crypto', 'domestic', 'overseas'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '0.6rem 0.4rem',
              borderRadius: '10px',
              border: activeTab === tab ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass)',
              background: activeTab === tab ? 'var(--accent-glow)' : 'var(--bg-secondary)',
              color: activeTab === tab ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontSize: '0.75rem',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.3rem',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              minWidth: 0
            }}
          >
            {tab === 'crypto' ? <Coins size={12} /> : tab === 'domestic' ? <Activity size={12} /> : <LineChart size={12} />}
            {tab === 'crypto' ? '가상자산' : tab === 'domestic' ? '국내주식' : '해외주식'}
          </button>
        ))}
      </div>

      {/* Control Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--bg-secondary)', padding: '0.2rem', borderRadius: '8px' }}>
          {INTERVALS.map(i => (
            <button
              key={i.value}
              onClick={() => setIntervalVal(i.value)}
              style={{
                padding: '0.3rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 800,
                border: 'none',
                background: interval === i.value ? 'var(--bg-surface)' : 'transparent',
                color: interval === i.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {i.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--bg-secondary)', padding: '0.2rem', borderRadius: '8px' }}>
          {CHART_STYLES.map(s => (
            <button
              key={s.value}
              onClick={() => setChartStyle(s.value)}
              style={{
                padding: '0.3rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 800,
                border: 'none',
                background: chartStyle === s.value ? 'var(--bg-surface)' : 'transparent',
                color: chartStyle === s.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Display */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 0 }}>
        {isLoading && !data ? <WidgetSkeleton /> : error ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>데이터 로드 실패</div> : data?.chart && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <AssetLogo src={data.chart.image} symbol={data.chart.symbol} size={36} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 1000 }}>{data.chart.symbol}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>{activeTab === 'crypto' ? 'Binance' : activeTab === 'domestic' ? 'KOSPI' : 'NASDAQ'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: data.chart.change >= 0 ? '#10b981' : '#f43f5e' }}>
                      {data.chart.change >= 0 ? '+' : ''}{data.chart.change.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              <LivePrice
                basePrice={data.chart.price}
                symbol={data.chart.symbol}
                currency={activeTab === 'domestic' ? '₩' : '$'}
                usdKrw={usdKrw}
                showDual={activeTab === 'crypto'}
              />
            </div>

            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)' }}>
              <TradingViewChart
                symbol={getCurrentSymbol()}
                theme={isDark ? 'dark' : 'light'}
                interval={interval}
                isCrypto={activeTab === 'crypto'}
                chartStyle={chartStyle}
              />
            </div>
          </div>
        )}

        {/* Ranking List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: '0.2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px 100px 80px', padding: '0.4rem 0.6rem', fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-glass)' }}>
            <span>순위</span>
            <span>종목</span>
            <span style={{ textAlign: 'center' }}>트렌드</span>
            <span style={{ textAlign: 'right' }}>가격</span>
            <span style={{ textAlign: 'right' }}>시가총액/변동</span>
          </div>
          {data?.marketCapList?.map((item: MarketAsset, idx: number) => (
            <div
              key={item.symbol}
              onClick={() => handleRankingClick(item)}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 80px 100px 80px',
                alignItems: 'center',
                padding: '0.6rem',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background 0.2s',
                border: item.symbol === (activeTab === 'crypto' ? cryptoSymbol : activeTab === 'domestic' ? domesticSymbol : overseasSymbol) ? '1px solid var(--accent-primary)' : '1px solid transparent',
                background: item.symbol === (activeTab === 'crypto' ? cryptoSymbol : activeTab === 'domestic' ? domesticSymbol : overseasSymbol) ? 'var(--accent-glow)' : 'transparent'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = item.symbol === (activeTab === 'crypto' ? cryptoSymbol : activeTab === 'domestic' ? domesticSymbol : overseasSymbol) ? 'var(--accent-glow)' : 'transparent')}
            >
              <span className="tabular-nums" style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)' }}>{idx + 1}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AssetLogo src={item.image} symbol={item.symbol} size={24} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 900 }}>{item.symbol}</span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 700 }}>{item.name}</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Sparkline change={item.price_change_percentage_24h} />
              </div>
              <RankingLivePrice 
                basePrice={item.current_price} 
                symbol={item.symbol} 
                currency={activeTab === 'domestic' ? '₩' : '$'}
                usdKrw={usdKrw}
              />
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 900, color: item.price_change_percentage_24h >= 0 ? '#10b981' : '#f43f5e' }}>
                  {item.price_change_percentage_24h >= 0 ? '+' : ''}{item.price_change_percentage_24h.toFixed(2)}%
                </span>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  {formatKoreanNumber(item.market_cap * (activeTab === 'domestic' ? 1 : usdKrw))}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
