'use client';

import { useState, useEffect, useMemo, useRef, memo } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Globe, Zap, ArrowRightLeft, Activity, Info } from 'lucide-react';
import styles from './Widget.module.css';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const MiniSpreadChart = memo(({ data }: { data: number[] }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 100 - ((v - min) / range) * 100
  }));

  const pathData = `M 0 ${points[0].y} ` + points.map(p => `L ${p.x} ${p.y}`).join(' ');

  return (
    <div style={{ width: '60px', height: '24px', position: 'relative' }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d={pathData} fill="none" stroke="var(--accent-primary)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d={`${pathData} L 100 100 L 0 100 Z`} fill="url(#spread-grad)" opacity="0.2" />
        <defs>
          <linearGradient id="spread-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-primary)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
});

MiniSpreadChart.displayName = 'MiniSpreadChart';

const DataBox = memo(({ label, value, subValue, change, icon: Icon, color = 'var(--text-primary)' }: any) => {
  const [flashClass, setFlashClass] = useState('');
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      const prevNum = parseFloat(String(prevValue.current).replace(/[^0-9.-]/g, ''));
      const currNum = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
      
      if (!isNaN(prevNum) && !isNaN(currNum)) {
        if (currNum > prevNum) setFlashClass(styles.priceFlashUp);
        else if (currNum < prevNum) setFlashClass(styles.priceFlashDown);
      } else {
        setFlashClass(styles.priceFlashUp);
      }
      
      const timer = setTimeout(() => setFlashClass(''), 800);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <div style={{ 
      padding: '0.6rem 0.5rem', 
      background: 'rgba(255,255,255,0.02)', 
      borderRadius: '10px', 
      border: '1px solid var(--border-glass)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.05rem',
      width: '110px', // 넓이 대폭 축소 (수익률 제거 반영)
      minWidth: '110px',
      flexShrink: 0,
      transition: 'border-color 0.2s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.1rem' }}>
        {Icon && <Icon size={10} style={{ color: '#64748b' }} />}
        <span style={{ fontSize: '0.55rem', fontWeight: 850, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem', overflow: 'hidden' }}>
        <span className={`${flashClass}`} style={{ 
          fontSize: '0.85rem', 
          fontWeight: 950, 
          color, 
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums', 
          letterSpacing: '-0.02em'
        }}>
          {value}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginTop: '0.1rem' }}>
        {subValue ? (
          <div style={{ fontSize: '0.55rem', color: '#475569', fontWeight: 800 }}>{subValue}</div>
        ) : <div style={{ height: '0.6rem' }} />}
      </div>
    </div>
  );
});

DataBox.displayName = 'DataBox';

export default function MacroDashBar() {
  const { data, isLoading } = useSWR('/api/macro', fetcher, { refreshInterval: 1200 }); // 1.2초로 초고속화
  const [spreadHistory, setSpreadHistory] = useState<number[]>([]);

  useEffect(() => {
    if (data?.macro?.yieldSpread?.value) {
      setSpreadHistory(prev => [...prev, data.macro.yieldSpread.value].slice(-20));
    }
  }, [data]);

  if (isLoading || !data?.macro) return null;

  const m = data.macro;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel"
      style={{ 
        padding: '0.75rem 1.1rem', 
        marginBottom: '1rem', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.75rem',
        borderRadius: '16px',
        border: '1px solid var(--border-glass)',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ padding: '0.35rem', background: 'var(--accent-gradient)', borderRadius: '8px', color: 'white' }}>
            <Globe size={14} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 1000, letterSpacing: '-0.01em' }}>매크로 인플럭스 <span style={{ color: 'var(--accent-primary)', fontSize: '0.65rem', marginLeft: '0.3rem', verticalAlign: 'middle' }}>LIVE</span></h4>
            <div style={{ fontSize: '0.5rem', color: '#64748b', fontWeight: 850, marginTop: '1px' }}>GLOBAL REAL-TIME DATA STREAM</div>
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.8rem', 
          background: 'rgba(99, 102, 241, 0.04)', 
          padding: '0.3rem 0.75rem', 
          borderRadius: '10px',
          border: '1px solid rgba(99, 102, 241, 0.08)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.5rem', fontWeight: 950, color: '#6366f1', textTransform: 'uppercase', opacity: 0.75 }}>KOR-USA SPREAD</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 1000, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
              {m.yieldSpread.value.toFixed(3)}%
            </span>
          </div>
          <MiniSpreadChart data={spreadHistory} />
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '0.4rem', 
        overflowX: 'auto', 
        paddingBottom: '0.2rem',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        justifyContent: 'flex-start'
      }}>
        <DataBox label="DXY INDEX" value={m.dxy.value.toFixed(3)} color="#f59e0b" />
        <DataBox label="US 10Y" value={`${m.us10y.value.toFixed(4)}%`} color="#ef4444" />
        <DataBox label="KR 10Y" value={`${m.kr10y.value.toFixed(4)}%`} color="#3b82f6" />
        
        <div style={{ width: '1px', height: '20px', background: 'var(--border-glass)', alignSelf: 'center', margin: '0 0.1rem' }} />
        
        <DataBox label="Bitcoin" value={`$${m.btc.value.toLocaleString(undefined, { minimumFractionDigits: 1 })}`} color="white" />
        <DataBox label="Ethereum" value={`$${m.eth.value.toLocaleString(undefined, { minimumFractionDigits: 1 })}`} color="#818cf8" />
        
        <div style={{ width: '1px', height: '20px', background: 'var(--border-glass)', alignSelf: 'center', margin: '0 0.1rem' }} />
        
        <DataBox label="BTC.DOM" value={`${m.dominance.btc}%`} color="var(--text-primary)" />
        <DataBox label="ETH.DOM" value={`${m.dominance.eth}%`} color="#818cf8" />
        <DataBox label="USDT.DOM" value={`${m.dominance.usdt}%`} color="#22c55e" />
        <DataBox label="USDC.DOM" value={`${m.dominance.usdc}%`} color="#3b82f6" />
      </div>
    </motion.div>
  );
}
