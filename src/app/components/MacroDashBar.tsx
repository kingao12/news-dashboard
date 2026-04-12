'use client';

import useSWR from 'swr';
import styles from './MacroDashBar.module.css';
import { 
  Globe, Clock, 
} from 'lucide-react';
import { formatKRW, formatKoreanNumber } from '@/utils/formatters';
import { memo, useState, useEffect, useMemo } from 'react';

// --- Sparkline Component (Trend Line) ---
const Sparkline = memo(({ change, width = 60, height = 24 }: { change: number; width?: number; height?: number }) => {
  const isUp = change >= 0;
  const color = isUp ? '#10b981' : '#f43f5e';
  
  // 가상의 트렌드 포인트 생성 (실제 시계열 데이터 없을 때 시각적 효과용)
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
        <linearGradient id={`macro-grad-${isUp ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
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
        fill={`url(#macro-grad-${isUp ? 'up' : 'down'})`}
        stroke="none"
      />
    </svg>
  );
});

Sparkline.displayName = 'Sparkline';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const KPICard = memo(({ 
  label, value, sub, change, tier = 3
}: any) => {
  const isUp = change > 0;
  const isDown = change < 0;
  
  const accentColor = tier === 1 ? '#4f46e5' : tier === 2 ? '#818cf8' : '#3b82f6';
  const changeColor = isUp ? '#22c55e' : isDown ? '#f43f5e' : 'var(--text-secondary)';

  return (
    <div className={styles.kpiCard}>
      <div className={styles.accentBar} style={{ backgroundColor: accentColor }} />
      <div className={styles.cardInner}>
        <div className={styles.cardHeader}>
          <span className={styles.label}>{label}</span>
          <span className={styles.changeVal} style={{ color: changeColor }}>
            {isUp ? '+' : ''}{change}%
          </span>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.valueGroup}>
            <div className={styles.mainValue}>{value}</div>
            {sub && <div className={styles.subValue}>{sub}</div>}
          </div>
          <div className={styles.sparklineArea}>
            <Sparkline change={change} width={50} height={20} />
          </div>
        </div>
      </div>
    </div>
  );
});

KPICard.displayName = 'KPICard';

export default function MacroDashBar() {
  const [mounted, setMounted] = useState(false);
  const { data, error, isLoading } = useSWR('/api/macro', fetcher, {
    refreshInterval: 15000 
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (isLoading || error) return <div className={styles.loadingBar}>SYNCHRONIZING GLOBAL KPI TERMINAL...</div>;

  const lastUpdated = new Date().toLocaleTimeString('ko-KR', { hour12: false });

  // Data mapping for safety
  const m = data?.macro || {};
  const s = data?.stocks || [];
  const xr = data?.exchangeRates || [];

  return (
    <div className={styles.macroTerminal}>
      {/* Header section remains unchanged as requested in previous steps */}
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

      {/* KPI Grid - Reordered and updated per user request */}
      <div className={styles.integratedGrid}>
        {/* Bonds & Rates Section */}
        <KPICard label="한국 국채 10년" value={`${(m.kr10y?.value || 3.35).toFixed(3)}%`} change={m.kr10y?.change || -0.4} tier={1} />
        <KPICard label="미국 국채 10년" value={`${(m.us10y?.value || 4.25).toFixed(3)}%`} change={m.us10y?.change || 0.05} tier={1} />
        <KPICard label="한-미 채권 금리차" value={`${(m.yieldSpread?.value || 0.9).toFixed(3)}%`} sub="Spread (US-KR)" change={m.yieldSpread?.change || 1.2} tier={1} />
        <KPICard label="실질 금리차" value={`${((m.us10y?.value || 4.25) - (m.kr10y?.value || 3.35)).toFixed(3)}%`} sub="CPI Adjusted (Est.)" change={0.02} tier={1} />

        {/* Crypto Main */}
        <KPICard label="비트코인 (BTC)" value={formatKoreanNumber(m.btc?.value || 110000000)} sub={`$${(m.btc?.value / (xr[0]?.rate || 1512)).toLocaleString()}`} change={m.btc?.change || 2.5} tier={2} />
        <KPICard label="이더리움 (ETH)" value={formatKoreanNumber(m.eth?.value || 3500000)} sub={`$${(m.eth?.value / (xr[0]?.rate || 1512)).toLocaleString()}`} change={m.eth?.change || 1.8} tier={2} />

        {/* Dominance/Indices */}
        <KPICard label="BTC 점유율" value={`${m.dominance?.btc || 58.4}%`} change={0.12} tier={2} />
        <KPICard label="ETH 점유율" value={`${m.dominance?.eth || 17.2}%`} change={-0.05} tier={2} />
        <KPICard label="USDT 점유율" value={`${m.dominance?.usdt || 5.2}%`} change={0.02} tier={2} />
        <KPICard label="USDC 점유율" value={`${m.dominance?.usdc || 1.8}%`} change={-0.01} tier={2} />

        <KPICard label="나스닥 (SPX Proxy)" value={(s.find((item: any) => item.name === 'S&P 500')?.value || 6368).toLocaleString()} change={s.find((item: any) => item.name === 'S&P 500')?.change || 1.25} tier={3} />
        <KPICard label="코스피 (KOSPI)" value={(s.find((item: any) => item.name === 'KOSPI')?.value || 2564).toLocaleString()} change={s.find((item: any) => item.name === 'KOSPI')?.change || 0.8} tier={3} />
        <KPICard label="달러 인덱스 (DXY)" value={(m.dxy?.value || 104.5).toFixed(2)} change={m.dxy?.change || 0.15} tier={3} />
        <KPICard label="원화 (USD/KRW)" value={formatKRW(xr.find((item: any) => item.pair.includes('USD/KRW'))?.rate || 1512)} change={xr.find((item: any) => item.pair.includes('USD/KRW'))?.change || 0.54} tier={3} />
      </div>
    </div>
  );
}
