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

export default function SentimentWidget() {
  const { data, error } = useSWR('/api/sentiment', fetcher, { refreshInterval: 30000 });
  if (error) return <div className={styles.widgetError}>공포·탐욕 데이터 로드 실패</div>;
  if (!data) return <WidgetSkeleton />;

  const crypto = data.crypto;
  const { color: cryptoColor } = getInfo(crypto.value);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={styles.widgetPanel}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ShieldAlert size={16} style={{ color: 'var(--accent-primary)' }} />
          <h3 className={styles.widgetHeader} style={{ marginBottom: 0, fontSize: '1rem' }}>센티멘트 터미널</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.6rem', color: '#64748b', fontWeight: 900, background: 'rgba(255,255,255,0.03)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
          <div className="live-indicator" style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }} />
          실시간 데이터
        </div>
      </div>

      <div style={{ 
        background: 'var(--bg-glass)', 
        borderRadius: '12px', 
        border: '1px solid var(--border-glass)', 
        padding: '0.7rem 1rem',
        marginBottom: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <GaugeArc value={crypto.value} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 900, marginBottom: '0.15rem', letterSpacing: '0.05em' }}>CRYPTO SENTIMENT</div>
          <motion.div 
            key={crypto.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ fontSize: '1.2rem', fontWeight: 950, color: cryptoColor, letterSpacing: '-0.02em' }}
          >
            {crypto.label}
          </motion.div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.15rem 0.35rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
              {crypto.change > 0 ? <TrendingUp size={10} color="#22c55e" /> : crypto.change < 0 ? <TrendingDown size={10} color="#ef4444" /> : <Minus size={10} color="#94a3b8" />}
              <span style={{ fontSize: '0.7rem', color: crypto.change > 0 ? '#22c55e' : crypto.change < 0 ? '#ef4444' : '#94a3b8', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                {crypto.change > 0 ? '+' : ''}{crypto.change}P
              </span>
            </div>
            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>
              VIX: <span style={{ color: 'var(--text-primary)' }}>{data.vix}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ 
        background: 'var(--bg-glass)', 
        borderRadius: '12px', 
        border: '1px solid var(--border-glass)', 
        padding: '0.7rem 1rem'
      }}>
        <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Global Equity Markets
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          <MiniBar label="GLOBAL" value={data.stocks.global.value} />
          <MiniBar label="USA" value={data.stocks.global.value} />
          <MiniBar label="KOREA" value={data.stocks.korea.value} />
          <MiniBar label="JAPAN" value={data.stocks.japan.value} />
          <MiniBar label="EUROPE" value={data.stocks.europe.value} />
          <MiniBar label="CHINA" value={data.stocks.china.value} />
        </div>
      </div>
    </motion.div>
  );
}
