'use client';

import { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import styles from './Widget.module.css';
import WidgetSkeleton from './WidgetSkeleton';
import { Coins, LineChart, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatKoreanNumber } from '@/utils/formatters';
import { MarketData, MarketAsset } from '@/types';
import {
  useMarketStore,
  selectPrice,
  selectPriceKRW,
  selectHistory,
  selectCurrency,
  selectExchangeRate,
} from '@/store/useMarketStore';
import dynamic from 'next/dynamic';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// ─────────────────────────────────────────────
// 포매터 헬퍼
// ─────────────────────────────────────────────
function fmtUSD(n: number): string {
  if (n >= 1000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(6)}`;
}
function fmtKRW(n: number): string {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(2)}억`;
  if (n >= 10_000) return `₩${n.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
  return `₩${n.toFixed(0)}`;
}

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
  { label: '일봉', value: '1d' },
];

const CHART_STYLES = [
  { label: '캔들', value: '1' },
  { label: '라인', value: '2' },
  { label: '영역', value: '3' },
  { label: '바', value: '0' },
];

// ─────────────────────────────────────────────
// TradingView 차트 — Binance 기준 심볼 강제
// ─────────────────────────────────────────────
const TradingViewChart = memo(
  ({
    symbol,
    theme,
    interval,
    isCrypto,
    chartStyle,
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
      containerRef.current.innerHTML = '';

      const intervalMap: Record<string, string> = {
        '1m': '1', '5m': '5', '15m': '15', '1h': '60', '1d': 'D',
      };
      const tvInterval = intervalMap[interval] || '1';

      // 심볼 표준화 — 항상 Binance 기준으로 통일
      let formattedSymbol = symbol;
      if (isCrypto) {
        const clean = symbol.replace('USDT', '').toUpperCase();
        formattedSymbol = `BINANCE:${clean}USDT`;  // ← Binance 데이터와 100% 일치
      } else if (!symbol.includes(':')) {
        formattedSymbol = `NASDAQ:${symbol.toUpperCase()}`;
      }

      // TradingView 권장 DOM 구조: 내부에 widget 컨테이너 생성
      const widgetDiv = document.createElement('div');
      widgetDiv.className = 'tradingview-widget-container__widget';
      widgetDiv.style.height = '100%';
      widgetDiv.style.width = '100%';
      containerRef.current.appendChild(widgetDiv);

      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.type = 'text/javascript';
      script.async = true;
      script.innerHTML = JSON.stringify({
        width: "100%",
        height: "100%",
        symbol: formattedSymbol,
        interval: tvInterval,
        timezone: 'Asia/Seoul',
        theme: theme === 'dark' ? 'dark' : 'light',
        style: chartStyle,
        locale: 'kr',
        enable_publishing: false,
        hide_top_toolbar: true,
        allow_symbol_change: false,
        save_image: false,
        backgroundColor: theme === 'dark' ? 'rgba(13,17,23,1)' : 'rgba(255,255,255,1)',
        gridColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      });
      containerRef.current.appendChild(script);

      return () => {
        if (containerRef.current) containerRef.current.innerHTML = '';
      };
    }, [symbol, theme, interval, isCrypto, chartStyle]);

    return (
      <div
        ref={containerRef}
        className="tradingview-widget-container"
        style={{
          width: '100%',
          height: '500px', // 충분한 고정 높이 할당
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
        }}
      />
    );
  }
);
TradingViewChart.displayName = 'TradingViewChart';

// ─────────────────────────────────────────────
// ApexCharts — 국내주식 전용
// ─────────────────────────────────────────────
const ApexCandleChart = memo(({ seriesData, theme }: { seriesData: any[], theme: string }) => {
  const options: any = {
    chart: {
      type: 'candlestick',
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: false }
    },
    theme: { mode: theme === 'dark' ? 'dark' : 'light' },
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#f43f5e', // 한국식: 상승이 빨강
          downward: '#3b82f6' // 하락이 파랑
        }
      }
    },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: 'var(--text-secondary)' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false }
    },
    yaxis: {
      labels: {
        style: { colors: 'var(--text-secondary)' },
        formatter: (val: number) => `₩${val.toLocaleString()}`
      }
    },
    grid: {
      borderColor: 'var(--border-glass)',
      strokeDashArray: 4,
    },
    tooltip: {
      theme: theme,
    }
  };

  return (
    <div style={{ width: '100%', height: '500px', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '0.5rem 0' }}>
      <ReactApexChart options={options} series={[{ data: seriesData || [] }]} type="candlestick" height="100%" />
    </div>
  );
});
ApexCandleChart.displayName = 'ApexCandleChart';

// ─────────────────────────────────────────────
// Sparkline — store history 직접 구독
// ─────────────────────────────────────────────
const Sparkline = memo(({ symbol, fallbackData, width = 80, height = 30 }: {
  symbol: string;
  fallbackData?: number[];
  width?: number;
  height?: number;
}) => {
  // 개별 심볼 history만 구독 (다른 심볼 변경 시 re-render 없음)
  const data = useMarketStore(selectHistory(symbol));
  const points = useMemo(() => {
    const src = data.length >= 2 ? data : (fallbackData ?? []);
    if (src.length < 2) return [];
    const min = Math.min(...src);
    const max = Math.max(...src);
    const range = max - min || 1;
    return src.map((v, i) => ({
      x: (i / (src.length - 1)) * width,
      y: height - ((v - min) / range) * height,
    }));
  }, [data, fallbackData, width, height]);

  if (points.length < 2) return <div style={{ width, height }} />;

  const isUp = points[points.length - 1].y <= points[0].y;
  const color = isUp ? '#10b981' : '#f43f5e';
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${symbol}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`${path} L ${width},${height} L 0,${height} Z`} fill={`url(#sg-${symbol})`} stroke="none" />
    </svg>
  );
});
Sparkline.displayName = 'Sparkline';

// ─────────────────────────────────────────────
// LivePrice — store에서만 가격 읽기, WS 직접 연결 없음
// ─────────────────────────────────────────────
const LivePrice = memo(({ symbol, basePrice, showBoth = false }: {
  symbol: string;
  basePrice: number;
  showBoth?: boolean;
}) => {
  const priceUSD = useMarketStore(selectPrice(symbol)) || basePrice;
  const priceKRW = useMarketStore(selectPriceKRW(symbol)) || basePrice;
  const currency = useMarketStore(selectCurrency);
  const isLive = useMarketStore((s) => !!s.symbols[symbol]);

  const [flash, setFlash] = useState('');
  const prev = useRef(priceUSD);

  useEffect(() => {
    if (priceUSD !== prev.current) {
      setFlash(priceUSD > prev.current ? 'price-flash-up' : 'price-flash-down');
      prev.current = priceUSD;
      const t = setTimeout(() => setFlash(''), 800);
      return () => clearTimeout(t);
    }
  }, [priceUSD]);

  const mainPrice = currency === 'KRW' ? priceKRW : priceUSD;
  const subPrice = currency === 'KRW' ? priceUSD : priceKRW;
  const mainFmt = currency === 'KRW' ? fmtKRW(mainPrice) : fmtUSD(mainPrice);
  const subFmt = currency === 'KRW' ? fmtUSD(subPrice) : fmtKRW(subPrice);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {isLive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 6px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '6px' }}>
            <span style={{ width: '5px', height: '5px', background: '#22c55e', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: '0.65rem', color: '#22c55e', fontWeight: 800 }}>LIVE</span>
          </div>
        )}
        <span
          className={`${flash} tabular-nums`}
          style={{ fontSize: '1.75rem', fontWeight: 900, color: currency === 'KRW' ? 'var(--text-primary)' : 'var(--accent-primary)', transition: 'color 0.3s' }}
        >
          {mainFmt}
        </span>
      </div>
      {showBoth && (
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
          {subFmt}
        </span>
      )}
    </div>
  );
});
LivePrice.displayName = 'LivePrice';

// ─────────────────────────────────────────────
// RankingLivePrice — store에서만 읽기
// ─────────────────────────────────────────────
const RankingLivePrice = memo(({ symbol, basePrice }: {
  symbol: string;
  basePrice: number;
}) => {
  const priceUSD = useMarketStore(selectPrice(symbol)) || basePrice;
  const priceKRW = useMarketStore(selectPriceKRW(symbol)) || basePrice;
  const currency = useMarketStore(selectCurrency);

  const [flash, setFlash] = useState('');
  const prev = useRef(priceUSD);

  useEffect(() => {
    if (priceUSD !== prev.current) {
      setFlash(priceUSD > prev.current ? 'price-flash-up' : 'price-flash-down');
      prev.current = priceUSD;
      const t = setTimeout(() => setFlash(''), 800);
      return () => clearTimeout(t);
    }
  }, [priceUSD]);

  const main = currency === 'KRW' ? fmtKRW(priceKRW) : fmtUSD(priceUSD);
  const sub = currency === 'KRW' ? fmtUSD(priceUSD) : fmtKRW(priceKRW);

  return (
    <div style={{ textAlign: 'right' }}>
      <div className={`${flash} tabular-nums`} style={{ fontSize: '0.85rem', fontWeight: 900, transition: 'color 0.3s' }}>
        {main}
      </div>
      <div className="tabular-nums" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
        {sub}
      </div>
    </div>
  );
});
RankingLivePrice.displayName = 'RankingLivePrice';

// ─────────────────────────────────────────────
// Asset Logo
// ─────────────────────────────────────────────
const AssetLogo = memo(({ src, symbol, size = 22 }: { src?: string; symbol: string; size?: number }) => {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.45, fontWeight: 800, color: 'var(--text-secondary)', border: '1px solid var(--border-glass)' }}>
        {symbol[0]}
      </div>
    );
  }
  return <img src={src} alt="" onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'contain', background: '#fff', border: '1px solid var(--border-glass)' }} />;
});
AssetLogo.displayName = 'AssetLogo';

// ─────────────────────────────────────────────
// Main Widget
// ─────────────────────────────────────────────
export default function MarketWidget() {
  // store에서 필요한 것만 개별 구독 (불필요한 리렌더 방지)
  const selectedSymbols = useMarketStore((s) => s.selectedSymbols);
  const setSelectedSymbol = useMarketStore((s) => s.setSelectedSymbol);
  const currency = useMarketStore(selectCurrency);
  const setCurrency = useMarketStore((s) => s.setCurrency);
  const exchangeRate = useMarketStore(selectExchangeRate);

  const [activeTab, setActiveTab] = useState<'crypto' | 'domestic' | 'overseas'>('crypto');
  const [interval, setIntervalVal] = useState('1m');
  const [chartStyle, setChartStyle] = useState('1');
  const [isDark, setIsDark] = useState(true);

  const cryptoSymbol = selectedSymbols.crypto;
  const domesticSymbol = selectedSymbols.domestic;
  const overseasSymbol = selectedSymbols.overseas;

  // 테마 감지
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-theme') !== 'light');
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  // 외부 이벤트 → 탭 & 심볼 전환
  useEffect(() => {
    const handler = (e: Event) => {
      const { symbol, category } = (e as CustomEvent).detail ?? {};
      if (!symbol) return;
      if (category === 'CRYPTO') {
        setActiveTab('crypto');
        setSelectedSymbol('crypto', symbol === 'EXCHANGE' ? 'BTC' : symbol);
      } else if (category === 'REGION') {
        setActiveTab(symbol === 'KR' ? 'domestic' : 'overseas');
        if (symbol === 'KR') setSelectedSymbol('domestic', '005930');
        else if (symbol === 'US') setSelectedSymbol('overseas', 'QQQ');
        else if (symbol === 'JP') setSelectedSymbol('overseas', '7203');
        else setSelectedSymbol('overseas', 'SPY');
      } else if (category === 'SECTOR') {
        setActiveTab('overseas');
        const map: Record<string, string> = { NVDA: 'NVDA', BANK: 'XLF', ENERGY: 'XLE' };
        setSelectedSymbol('overseas', map[symbol] ?? 'SPY');
      } else {
        setActiveTab('overseas');
        const map: Record<string, string> = { EQUITY: 'SPY', BOND: 'TLT', GOLD: 'GLD' };
        setSelectedSymbol('overseas', map[symbol] ?? 'SPY');
      }
    };
    window.addEventListener('change-market-symbol', handler);
    return () => window.removeEventListener('change-market-symbol', handler);
  }, [setSelectedSymbol]);

  // API 데이터 (랭킹 리스트 + 차트 메타)
  const endpoint =
    activeTab === 'crypto'
      ? `/api/crypto?symbol=${cryptoSymbol}&interval=${interval}`
      : activeTab === 'domestic'
      ? `/api/stocks?symbol=${domesticSymbol}&interval=${interval}&market=kr`
      : `/api/stocks?symbol=${overseasSymbol}&interval=${interval}&market=us`;

  const { data, error, isLoading } = useSWR<MarketData>(endpoint, fetcher, {
    keepPreviousData: true,
    refreshInterval: 5000,
  });

  const handleRankingClick = useCallback(
    (item: MarketAsset) => {
      if (activeTab === 'crypto') setSelectedSymbol('crypto', item.symbol);
      else if (activeTab === 'domestic') setSelectedSymbol('domestic', item.symbol);
      else setSelectedSymbol('overseas', item.symbol);
    },
    [activeTab, setSelectedSymbol]
  );

  const tvSymbol =
    activeTab === 'crypto'
      ? cryptoSymbol          // TradingViewChart 안에서 BINANCE:BTCUSDT 로 변환됨
      : activeTab === 'domestic'
      ? `KRX:${domesticSymbol}`
      : `NASDAQ:${overseasSymbol}`;

  const activeSymbol =
    activeTab === 'crypto' ? cryptoSymbol
    : activeTab === 'domestic' ? domesticSymbol
    : overseasSymbol;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-panel"
      style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1rem' }}
    >
      {/* ── 탭 스위처 ── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {(['crypto', 'domestic', 'overseas'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '0.6rem 0.4rem', borderRadius: '10px',
              border: activeTab === tab ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass)',
              background: activeTab === tab ? 'var(--accent-glow)' : 'var(--bg-secondary)',
              color: activeTab === tab ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontSize: '0.75rem', fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
              transition: 'all 0.2s', whiteSpace: 'nowrap', minWidth: 0, cursor: 'pointer',
            }}
          >
            {tab === 'crypto' ? <Coins size={12} /> : tab === 'domestic' ? <Activity size={12} /> : <LineChart size={12} />}
            {tab === 'crypto' ? '가상자산' : tab === 'domestic' ? '국내주식' : '해외주식'}
          </button>
        ))}
      </div>

      {/* ── 컨트롤 바 ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        {/* 인터벌 */}
        <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--bg-secondary)', padding: '0.2rem', borderRadius: '8px' }}>
          {INTERVALS.map((i) => (
            <button key={i.value} onClick={() => setIntervalVal(i.value)}
              style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, border: 'none',
                background: interval === i.value ? 'var(--bg-surface)' : 'transparent',
                color: interval === i.value ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}>
              {i.label}
            </button>
          ))}
        </div>

        {/* 통화 토글 — 전역 store 직접 변경 */}
        <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--bg-secondary)', padding: '0.2rem', borderRadius: '8px' }}>
          {(['KRW', 'USD'] as const).map((m) => (
            <button key={m} onClick={() => setCurrency(m)}
              style={{ padding: '0.3rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 900, border: 'none',
                background: currency === m ? 'var(--accent-primary)' : 'transparent',
                color: currency === m ? '#000' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}>
              {m}
            </button>
          ))}
        </div>

        {/* 차트 스타일 */}
        <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--bg-secondary)', padding: '0.2rem', borderRadius: '8px' }}>
          {CHART_STYLES.map((s) => (
            <button key={s.value} onClick={() => setChartStyle(s.value)}
              style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, border: 'none',
                background: chartStyle === s.value ? 'var(--bg-surface)' : 'transparent',
                color: chartStyle === s.value ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 메인 디스플레이 ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 0 }}>
        {isLoading && !data ? (
          <WidgetSkeleton />
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>데이터 로드 실패</div>
        ) : data?.chart && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {/* 심볼 정보 + 실시간 가격 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <AssetLogo src={data.chart.image} symbol={data.chart.symbol} size={36} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900 }}>{data.chart.symbol}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                      {activeTab === 'crypto' ? 'Binance' : activeTab === 'domestic' ? 'KOSPI' : 'NASDAQ'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: data.chart.change >= 0 ? '#10b981' : '#f43f5e' }}>
                    {data.chart.change >= 0 ? '+' : ''}{data.chart.change.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* LivePrice — store 구독, WS 직접 연결 없음 */}
              <LivePrice
                symbol={data.chart.symbol}
                basePrice={data.chart.price}
                showBoth={activeTab === 'crypto'}
              />
            </div>

            {/* ── 메인 차트 ── */}
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              {activeTab === 'domestic' && data?.chart?.series ? (
                 <ApexCandleChart seriesData={data.chart.series} theme={isDark ? 'dark' : 'light'} />
              ) : (
                <TradingViewChart
                  key={activeSymbol + interval + chartStyle + activeTab}
                  symbol={tvSymbol}
                  theme={isDark ? 'dark' : 'light'}
                  interval={interval}
                  isCrypto={activeTab === 'crypto'}
                  chartStyle={chartStyle}
                />
              )}
            </div>
          </div>
        )}

        {/* 랭킹 리스트 */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: '0.2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 76px 96px 72px', padding: '0.4rem 0.6rem', fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-glass)' }}>
            <span>#</span><span>종목</span>
            <span style={{ textAlign: 'center' }}>추세</span>
            <span style={{ textAlign: 'right' }}>가격</span>
            <span style={{ textAlign: 'right' }}>변동/시총</span>
          </div>

          {data?.marketCapList?.map((item: MarketAsset, idx: number) => {
            const isActive = item.symbol === activeSymbol;
            return (
              <div
                key={item.symbol}
                onClick={() => handleRankingClick(item)}
                style={{
                  display: 'grid', gridTemplateColumns: '36px 1fr 76px 96px 72px',
                  alignItems: 'center', padding: '0.6rem', borderRadius: '8px',
                  cursor: 'pointer', transition: 'background 0.15s',
                  border: isActive ? '1px solid var(--accent-primary)' : '1px solid transparent',
                  background: isActive ? 'var(--accent-glow)' : 'transparent',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? 'var(--accent-glow)' : 'transparent'; }}
              >
                <span className="tabular-nums" style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)' }}>{idx + 1}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AssetLogo src={item.image} symbol={item.symbol} size={24} />
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 900 }}>{item.symbol}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 700 }}>{item.name}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {/* Sparkline: store history 구독 */}
                  <Sparkline
                    symbol={item.symbol}
                    fallbackData={[item.current_price * (1 - item.price_change_percentage_24h / 100), item.current_price]}
                    width={70}
                    height={26}
                  />
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', fontWeight: 800 }}>
                  <div className={styles.itemPrice}>
                    {activeTab === 'domestic' ? fmtKRW(item.current_price) : `$${formatVal(item.current_price)}`}
                  </div>
                  <div className={styles.itemMarketCap}>
                    {activeTab === 'domestic' ? `₩${(item.market_cap / 1000000000000).toFixed(1)}조` : `₩${(item.market_cap / 100000000).toFixed(0)}억`}
                  </div>
                  <RankingLivePrice symbol={item.symbol} basePrice={item.current_price} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 900, color: item.price_change_percentage_24h >= 0 ? '#10b981' : '#f43f5e' }}>
                    {item.price_change_percentage_24h >= 0 ? '+' : ''}{item.price_change_percentage_24h.toFixed(2)}%
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    {formatKoreanNumber(item.market_cap * (activeTab === 'domestic' ? 1 : exchangeRate))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
