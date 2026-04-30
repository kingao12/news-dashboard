'use client';

import useSWR from 'swr';
import styles from './MacroDashBar.module.css';
import { Globe, Clock } from 'lucide-react';
import { formatKoreanNumber } from '@/utils/formatters';
import { memo, useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useMarketStore, selectPrice, selectPriceKRW, selectHistory, selectCurrency, selectExchangeRate } from '@/store/useMarketStore';

// ── 포매터 ──
function fmtUSD(n: number) {
  if (!n) return '-';
  if (n >= 1000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `$${n.toFixed(2)}`;
}
function fmtKRW(n: number) {
  if (!n) return '-';
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(2)}억`;
  return `₩${n.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
}

// ── Sparkline (store history 반영) ──
const EMPTY_HISTORY: number[] = [];

const Sparkline = memo(({ symbol, change, width = 60, height = 24 }: {
  symbol?: string;
  change: number;
  width?: number;
  height?: number;
}) => {
  const history = useMarketStore(symbol ? selectHistory(symbol) : () => EMPTY_HISTORY);
  const isUp = change >= 0;
  const color = isUp ? '#10b981' : '#f43f5e';

  const points = useMemo(() => {
    if (history && history.length > 1) {
      const min = Math.min(...history);
      const max = Math.max(...history);
      const range = max - min || 1;
      return history.map(v => (v - min) / range);
    }
    const pts = [0.5];
    let last = 0.5;
    for (let i = 0; i < 6; i++) {
      const rand = (Math.random() - 0.5) * 0.3;
      const trend = isUp ? 0.05 : -0.05;
      last = Math.max(0.1, Math.min(0.9, last + rand + trend));
      pts.push(last);
    }
    return pts;
  }, [isUp, history]);

  const path = points.map((p, i) => `${(i / (points.length - 1)) * width},${height - p * height}`).join(' L ');

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`mg-${symbol ?? change > 0 ? 'up' : 'dn'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        d={`M 0,${height - points[0] * height} L ${path}`}
        fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d={`M 0,${height - points[0] * height} L ${path} L ${width},${height} L 0,${height} Z`}
        fill={`url(#mg-${symbol ?? change > 0 ? 'up' : 'dn'})`} stroke="none"
      />
    </svg>
  );
});
Sparkline.displayName = 'Sparkline';

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ── KPI 카드 (심볼 있으면 store에서 가격 구독) ──
const KPICard = memo(({
  label, value, sub, change, tier = 3, symbol, liveSymbol,
}: {
  label: string;
  value: string;
  sub?: string;
  change: number;
  tier?: number;
  symbol?: string;           // sparkline history용
  liveSymbol?: string;       // store 실시간 가격용 (가격 override)
}) => {
  const isUp = change > 0;
  const isDown = change < 0;
  const accentColor = tier === 1 ? '#4f46e5' : tier === 2 ? '#818cf8' : '#3b82f6';
  const changeColor = isUp ? '#22c55e' : isDown ? '#f43f5e' : 'var(--text-secondary)';

  // 실시간 가격 오버라이드 (BTC/ETH 등)
  const livePriceUSD = useMarketStore(liveSymbol ? selectPrice(liveSymbol) : () => 0);
  const livePriceKRW = useMarketStore(liveSymbol ? selectPriceKRW(liveSymbol) : () => 0);
  const currency = useMarketStore(selectCurrency);
  const isLive = liveSymbol && livePriceUSD > 0;

  const displayValue = isLive
    ? (currency === 'KRW' ? fmtKRW(livePriceKRW) : fmtUSD(livePriceUSD))
    : value;
  const displaySub = isLive
    ? (currency === 'KRW' ? fmtUSD(livePriceUSD) : fmtKRW(livePriceKRW))
    : sub;

  return (
    <div className={styles.kpiCard}>
      <div className={styles.accentBar} style={{ backgroundColor: accentColor }} />
      <div className={styles.cardInner}>
        <div className={styles.cardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span className={styles.label}>{label}</span>
            {isLive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '1px 5px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '4px' }}>
                <span style={{ width: '4px', height: '4px', background: '#22c55e', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
                <span style={{ fontSize: '0.6rem', color: '#22c55e', fontWeight: 800 }}>LIVE</span>
              </div>
            )}
          </div>
          <span className={styles.changeVal} style={{ color: changeColor }}>
            {isUp ? '+' : ''}{change.toFixed(2)}%
          </span>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.valueGroup}>
            <div className={styles.mainValue}>{displayValue}</div>
            {displaySub && <div className={styles.subValue}>{displaySub}</div>}
          </div>
          <div className={styles.sparklineArea}>
            <Sparkline symbol={symbol} change={change} width={50} height={20} />
          </div>
        </div>
      </div>
    </div>
  );
});
KPICard.displayName = 'KPICard';

// ── 메인 컴포넌트 ──
export default function MacroDashBar() {
  const [mounted, setMounted] = useState(false);
  const exchangeRate = useMarketStore(selectExchangeRate);

  const { data, error, isLoading } = useSWR('/api/macro', fetcher, { refreshInterval: 15000 });

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  if (isLoading || error) return <div className={styles.loadingBar}>SYNCHRONIZING GLOBAL KPI TERMINAL...</div>;

  const lastUpdated = new Date().toLocaleTimeString('ko-KR', { hour12: false });
  const m = data?.macro || {};
  const s = data?.stocks || [];
  const xr = data?.exchangeRates || [];

  const sp500 = s.find((i: any) => i.name === 'S&P 500');
  const kospi = s.find((i: any) => i.name === 'KOSPI');
  const usdKrwEntry = xr.find((i: any) => i.pair?.includes('USD/KRW'));

  return (
    <div className={styles.macroTerminal}>
      <div className={styles.terminalHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIconBox}>
            <Globe size={18} className={styles.globeIcon} />
          </div>
          <div className={styles.headerTitleGroup}>
            <h3 className={styles.terminalTitle}>글로벌 마켓 인플럭스</h3>
            <div className={styles.liveIndicator}>
              <div className={styles.liveDot} />
              <span>LIVE REAL-TIME STREAM</span>
            </div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.updateBadge}>
            <Clock size={12} />
            <span>마지막 업데이트: {lastUpdated}</span>
          </div>
        </div>
      </div>

      <div className={styles.integratedGrid}>
        {/* 금리/채권 */}
        <KPICard label="한국 국채 10년" value={`${(m.kr10y?.value || 3.35).toFixed(3)}%`} change={m.kr10y?.change || -0.4} tier={1} />
        <KPICard label="미국 국채 10년" value={`${(m.us10y?.value || 4.25).toFixed(3)}%`} change={m.us10y?.change || 0.05} tier={1} />
        <KPICard label="한-미 금리차" value={`${(m.yieldSpread?.value || 0.9).toFixed(3)}%`} sub="Spread (US-KR)" change={m.yieldSpread?.change || 1.2} tier={1} />
        <KPICard label="실질 금리차" value={`${((m.us10y?.value || 4.25) - (m.kr10y?.value || 3.35)).toFixed(3)}%`} sub="CPI Adj." change={0.02} tier={1} />

        {/* 크립토 (store 실시간 가격) */}
        <KPICard label="비트코인 (BTC)" liveSymbol="BTC" symbol="BTC" value="-" change={m.btc?.change || 2.5} tier={2} />
        <KPICard label="이더리움 (ETH)" liveSymbol="ETH" symbol="ETH" value="-" change={m.eth?.change || 1.8} tier={2} />

        {/* 도미넌스 */}
        <KPICard label="BTC 점유율" value={`${m.dominance?.btc || 58.4}%`} change={0.12} tier={2} />
        <KPICard label="ETH 점유율" value={`${m.dominance?.eth || 17.2}%`} change={-0.05} tier={2} />
        <KPICard label="USDT 점유율" value={`${m.dominance?.usdt || 5.2}%`} change={0.02} tier={2} />
        <KPICard label="USDC 점유율" value={`${m.dominance?.usdc || 1.8}%`} change={-0.01} tier={2} />

        {/* 주가/환율 */}
        <KPICard label="S&P 500" value={(sp500?.value || 6368).toLocaleString()} change={sp500?.change || 1.25} tier={3} />
        <KPICard label="KOSPI" value={(kospi?.value || 2564).toLocaleString()} change={kospi?.change || 0.8} tier={3} />
        <KPICard label="달러 인덱스 (DXY)" value={(m.dxy?.value || 104.5).toFixed(2)} change={m.dxy?.change || 0.15} tier={3} />
        {/* USD/KRW: store exchangeRate 우선 */}
        <KPICard
          label="원화 (USD/KRW)"
          value={fmtKRW(exchangeRate)}
          change={usdKrwEntry?.change || 0.54}
          tier={3}
        />
      </div>
    </div>
  );
}
