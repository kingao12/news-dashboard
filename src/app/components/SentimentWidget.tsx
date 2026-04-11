'use client';
import useSWR from 'swr';
import styles from './Widget.module.css';
import WidgetSkeleton from './WidgetSkeleton';
import { TrendingUp, TrendingDown, Minus, Activity, ShieldAlert, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('API Error');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
};

const GaugeArc = ({ value }: { value: number }) => {
  const pct = value / 100;
  const circumference = 2 * Math.PI * 54;
  const offset = circumference * (1 - pct * 0.75);
  const color = value <= 20 ? '#ef4444' : value <= 40 ? '#f97316' : value <= 60 ? '#eab308' : value <= 80 ? '#22c55e' : '#10b981';

  return (
    <div style={{ position: 'relative', width: '100px', height: '80px' }}>
      <svg width="100" height="80" viewBox="0 0 130 120" style={{ overflow: 'visible' }}>
        <circle cx="65" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="12"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={circumference * 0.375} strokeLinecap="round" />
        <motion.circle 
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${circumference * 0.75 * pct} ${circumference}` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          cx="65" cy="70" r="54" fill="none" stroke={color} strokeWidth="12"
          strokeDashoffset={circumference * 0.375} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color}44)` }} />
      </svg>
      <div style={{ position: 'absolute', top: '48%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ fontSize: '1.4rem', fontWeight: 950, color: color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}
        >
          {value}
        </motion.div>
        <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#64748b', marginTop: '1px' }}>SCORE</div>
      </div>
    </div>
  );
};

const getInfo = (v: number) => {
  if (v <= 20) return { label: '극단적 공포', color: '#ef4444' };
  if (v <= 40) return { label: '공포', color: '#f97316' };
  if (v <= 60) return { label: '중립', color: '#eab308' };
  if (v <= 80) return { label: '탐욕', color: '#22c55e' };
  return { label: '극단적 탐욕', color: '#10b981' };
};

const MiniBar = ({ label, value }: { label: string; value: number }) => {
  const getStockColor = (val: number) => {
    if (val < 40) return '#ef4444';
    if (val < 60) return '#64748b';
    return '#22c55e';
  };
  const color = getStockColor(value);
  const { label: lab } = getInfo(value);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
      <span style={{ fontSize: '0.7rem', color: '#94a3b8', minWidth: '50px', fontWeight: 800, letterSpacing: '0.02em' }}>{label}</span>
      <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.03)', position: 'relative', overflow: 'hidden' }}>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ height: '100%', borderRadius: '2px', background: color, boxShadow: `0 0 8px ${color}44` }} 
        />
      </div>
      <div style={{ minWidth: '80px', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{value}</span>
        <span style={{ fontSize: '0.6rem', color, fontWeight: 900, textTransform: 'uppercase' }}>{lab}</span>
      </div>
    </div>
  );
};

import GlobalRiskRadar from './GlobalRiskRadar';

export default function SentimentWidget() {
  const { data, error } = useSWR('/api/sentiment', fetcher, { refreshInterval: 30000 });
  if (error) return <div className={styles.widgetError}>공포·탐욕 데이터 로드 실패</div>;
  if (!data) return <WidgetSkeleton />;

  const crypto = data.crypto;
  const { color: cryptoColor } = getInfo(crypto.value);

  // Radar Data Mapping (Mocked based on VIX and Market Status)
  const radarData = [
    { label: 'EQUITY (VIX)', value: data.vix > 30 ? 85 : data.vix > 20 ? 60 : 35, color: '#f43f5e' },
    { label: 'CRYPTO', value: crypto.value < 30 ? 90 : crypto.value < 50 ? 65 : 40, color: '#f59e0b' },
    { label: 'FOREX', value: 45, color: '#3b82f6' },
    { label: 'BONDS', value: 72, color: '#ef4444' },
    { label: 'COMMODITY', value: 28, color: '#10b981' }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={styles.widgetPanel}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 'fit-content' }}>
          <ShieldAlert size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <h3 className={styles.widgetHeader} style={{ marginBottom: 0 }}>센티멘트 터미널</h3>
        </div>
        <div className={styles.liveIndicatorTag} style={{ marginLeft: 'auto' }}>
          <div className="live-indicator" style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
          <span>REAL-TIME ANALYSIS</span>
        </div>
      </div>

      <div className={styles.gaugeContainerOuter}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <GaugeArc value={crypto.value} />
          <div style={{ flex: 1 }}>
            <div className={styles.labelMuted}>CRYPTO SENTIMENT</div>
            <motion.div 
              key={crypto.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ fontSize: '1.45rem', fontWeight: 1000, color: cryptoColor, letterSpacing: '-0.03em' }}
            >
              {crypto.label}
            </motion.div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.4rem' }}>
              <div className={styles.changeBadge}>
                {crypto.change > 0 ? <TrendingUp size={10} color="#22c55e" /> : crypto.change < 0 ? <TrendingDown size={10} color="#ef4444" /> : <Minus size={10} color="#94a3b8" />}
                <span style={{ color: crypto.change > 0 ? '#22c55e' : crypto.change < 0 ? '#ef4444' : '#94a3b8' }}>
                  {crypto.change > 0 ? '+' : ''}{crypto.change}P
                </span>
              </div>
              <div className={styles.vixTag}>VIX: {data.vix}</div>
            </div>
          </div>
        </div>

        {/* Global Risk Radar Section */}
        <div className={styles.radarSection}>
           <div className={styles.radarHeader}>
              <Zap size={12} color="#8b5cf6" fill="#8b5cf6" />
              <span>MARKET VOLATILITY RADAR</span>
           </div>
           <div className={styles.radarBody}>
              <GlobalRiskRadar data={radarData} size={220} />
           </div>
           <div className={styles.radarFooter}>
              <div className={styles.radarInfo}>
                 <Activity size={10} />
                 <span>채권(Bonds) 중심의 변동성 전이 리스크 포착</span>
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
}
