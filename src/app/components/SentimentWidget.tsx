'use client';
import useSWR from 'swr';
import styles from './Widget.module.css';
import WidgetSkeleton from './WidgetSkeleton';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const GaugeArc = ({ value }: { value: number }) => {
  const pct = value / 100;
  const circumference = 2 * Math.PI * 54;
  const offset = circumference * (1 - pct * 0.75);
  const color = value <= 20 ? '#ef4444' : value <= 40 ? '#f97316' : value <= 60 ? '#eab308' : value <= 80 ? '#22c55e' : '#10b981';

  return (
    <svg width="130" height="110" viewBox="0 0 130 120" style={{ overflow: 'visible' }}>
      <circle cx="65" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10"
        strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
        strokeDashoffset={circumference * 0.375} strokeLinecap="round" />
      <circle cx="65" cy="70" r="54" fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${circumference * 0.75 * pct} ${circumference}`}
        strokeDashoffset={circumference * 0.375} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease', filter: `drop-shadow(0 0 6px ${color}66)` }} />
      <text x="65" y="60" textAnchor="middle" fill={color} fontSize="20" fontWeight="900" fontFamily="monospace">{value}</text>
      <text x="65" y="75" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="700">/ 100</text>
    </svg>
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
    if (val < 50) return '#ef4444'; // 하락색 (빨강)
    if (val === 50) return '#000000'; // 50일때는 검정색
    return '#22c55e'; // 상승색 (미국 증시 상승 초록색)
  };
  const color = getStockColor(value);
  const { label: lab } = getInfo(value);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', minWidth: '60px', fontWeight: 600 }}>{label}</span>
      <div style={{ flex: 1, height: '6px', borderRadius: '9999px', background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ width: `${value}%`, height: '100%', borderRadius: '9999px', background: color, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 800, color, minWidth: '28px', textAlign: 'right', fontFamily: 'monospace' }}>{value}</span>
      <span style={{ fontSize: '0.65rem', color, minWidth: '55px', fontWeight: 700 }}>{lab}</span>
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
    <div className={styles.widgetPanel}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 className={styles.widgetHeader} style={{ marginBottom: 0 }}>
          <Activity size={16} /> 공포·탐욕 지수 (Fear &amp; Greed)
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#94a3b8' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }} />
          LIVE
        </div>
      </div>

      {/* Crypto Gauge */}
      <div style={{ 
        background: 'var(--bg-glass)', 
        borderRadius: '16px', 
        border: '1px solid var(--border-glass)', 
        padding: '1rem',
        marginBottom: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <GaugeArc value={crypto.value} />
        <div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.2rem' }}>가상자산 공포탐욕</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: cryptoColor }}>{crypto.label}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem' }}>
            {crypto.change > 0 ? <TrendingUp size={12} color="#22c55e" /> : crypto.change < 0 ? <TrendingDown size={12} color="#ef4444" /> : <Minus size={12} color="#94a3b8" />}
            <span style={{ fontSize: '0.72rem', color: crypto.change > 0 ? '#22c55e' : crypto.change < 0 ? '#ef4444' : '#94a3b8', fontWeight: 700 }}>
              전일 대비 {crypto.change > 0 ? '+' : ''}{crypto.change}p
            </span>
          </div>
          <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.2rem' }}>VIX 지수: {data.vix}</div>
        </div>
      </div>

      {/* Market Multi-bars */}
      <div style={{ 
        background: 'var(--bg-glass)', 
        borderRadius: '12px', 
        border: '1px solid var(--border-glass)', 
        padding: '0.9rem'
      }}>
        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          글로벌 주식 시장 심리
        </div>
        <MiniBar label="글로벌" value={data.stocks.global.value} />
        <MiniBar label="🇺🇸 미국" value={data.stocks.global.value} />
        <MiniBar label="🇰🇷 한국" value={data.stocks.korea.value} />
        <MiniBar label="🇯🇵 일본" value={data.stocks.japan.value} />
        <MiniBar label="🇪🇺 유럽" value={data.stocks.europe.value} />
        <MiniBar label="🇨🇳 중국" value={data.stocks.china.value} />
      </div>
    </div>
  );
}
