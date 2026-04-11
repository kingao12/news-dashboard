'use client';

import { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { Zap, Volume2, VolumeX, RefreshCcw, Clock, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Widget.module.css';
import { formatKRW, formatKoreanNumber } from '@/utils/formatters';

interface Trade {
  id: string;
  symbol: string;
  price: number;
  qty: number;
  usdValue: number;
  krwValue: number;
  isBuyerMaker: boolean;
  time: number;
  isFutures: boolean;
}

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT', 'BNBUSDT', 'ADAUSDT', 'AVAXUSDT'];
const USD_KRW_RATE = 1400; // API 연동 전 기본값

const TradeRow = memo(({ t, currencyMode }: { t: Trade; currencyMode: string }) => {
  const isBuy = !t.isBuyerMaker;
  const color = isBuy ? '#10b981' : '#f43f5e';
  const glow = isBuy ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)';
  
  const timeStr = useMemo(() => 
    new Date(t.time).toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    [t.time]
  );

  return (
    <motion.div
      layout
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={styles.tradeCard}
      style={{
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: 'var(--bg-secondary)', 
        borderLeft: `4px solid ${color}`,
        padding: '0.8rem 1rem', 
        borderRadius: '4px 12px 12px 4px',
        marginBottom: '0.5rem',
        border: '1px solid var(--border-glass)',
        boxShadow: `0 4px 12px ${glow}`,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>Binance</span>
          <div 
            style={{ 
              fontSize: '0.6rem', 
              color: 'white', 
              fontWeight: 900, 
              background: color,
              padding: '0.1rem 0.4rem', 
              borderRadius: '4px' 
            }}
          >
            {isBuy ? 'LONG' : 'SHORT'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.1rem' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 1000, color: 'var(--text-primary)' }}>
            {t.symbol.replace('USDT', '')}
          </span>
          <span className="tabular-nums" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
            {timeStr}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
        <div className="tabular-nums" style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
          ${t.price.toLocaleString(undefined, { minimumFractionDigits: 1 })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }}
          />
          <span style={{ fontSize: '1.2rem', fontWeight: 1000, color, letterSpacing: '-0.02em' }} className="tabular-nums">
            {currencyMode === 'KRW' ? formatKoreanNumber(t.krwValue) : `$${(t.usdValue / 1000).toFixed(1)}k`}
          </span>
        </div>
      </div>
    </motion.div>
  );
});

TradeRow.displayName = 'TradeRow';

const StatsBanner = memo(({ trades }: { trades: Trade[] }) => {
  const stats = useMemo(() => {
    if (trades.length === 0) return null;
    const buys = trades.filter(t => !t.isBuyerMaker);
    const totalKRW = trades.reduce((s, t) => s + t.krwValue, 0);
    const buyRatio = (buys.length / trades.length) * 100;
    return { buyRatio, totalKRW, count: trades.length };
  }, [trades]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
      <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'var(--bg-secondary)' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)' }}>실시간 매수 비율</span>
        <div style={{ height: '6px', width: '100%', background: '#f43f5e33', borderRadius: '3px', overflow: 'hidden' }}>
          <motion.div 
            animate={{ width: `${stats?.buyRatio || 50}%` }}
            style={{ height: '100%', background: '#10b981' }} 
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 900 }}>
          <span style={{ color: '#10b981' }}>{(stats?.buyRatio ?? 50).toFixed(0)}%</span>
          <span style={{ color: '#f43f5e' }}>{(100 - (stats?.buyRatio ?? 50)).toFixed(0)}%</span>
        </div>
      </div>
      <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)' }}>누적 고래 거래량</span>
        <span style={{ fontSize: '1.1rem', fontWeight: 1000, color: '#f59e0b' }} className="tabular-nums">
          {formatKoreanNumber(stats?.totalKRW || 0)}
        </span>
      </div>
    </div>
  );
});

StatsBanner.displayName = 'StatsBanner';

export default function WhaleTradesWidget() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [thresholdKRW, setThresholdKRW] = useState<number>(10000000); // Default 10M KRW
  const [currencyMode, setCurrencyMode] = useState<'KRW' | 'USD'>('KRW');
  const [wsStatus, setWsStatus] = useState<'connecting' | 'live' | 'error'>('connecting');

  const wsRef = useRef<WebSocket | null>(null);
  const tradeBuffer = useRef<Trade[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (tradeBuffer.current.length === 0) return;
      const incoming = tradeBuffer.current.splice(0);
      setTrades(prev => [...incoming, ...prev].slice(0, 15));
    }, 400); // Snappy update
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let mounted = true;
    const connect = () => {
      setWsStatus('connecting');
      const streams = SYMBOLS.map(s => `${s.toLowerCase()}@aggTrade`).join('/');
      const ws = new WebSocket(`wss://fstream.binance.com/stream?streams=${streams}`);
      wsRef.current = ws;

      ws.onopen = () => mounted && setWsStatus('live');
      ws.onmessage = (e) => {
        const { data } = JSON.parse(e.data);
        if (!data) return;
        const val = parseFloat(data.p) * parseFloat(data.q) * 1400;
        if (val >= thresholdKRW) {
          tradeBuffer.current.push({
            id: `${data.s}-${data.T}-${Math.random()}`,
            symbol: data.s,
            price: parseFloat(data.p),
            qty: parseFloat(data.q),
            usdValue: parseFloat(data.p) * parseFloat(data.q),
            krwValue: val,
            isBuyerMaker: data.m,
            time: data.T,
            isFutures: true
          });
        }
      };
      ws.onclose = () => mounted && setTimeout(connect, 3000);
    };

    connect();
    return () => { mounted = false; wsRef.current?.close(); };
  }, [thresholdKRW]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ 
            background: 'var(--accent-glow)', 
            padding: '0.4rem', 
            borderRadius: '8px',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Zap size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 1000 }}>라이브 오더플로우</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: wsStatus === 'live' ? '#10b981' : '#f59e0b' }} />
              <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                {wsStatus === 'live' ? 'REAL-TIME CONNECTED' : 'CONNECTING...'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <select 
            className={styles.minimalSelect}
            value={thresholdKRW}
            onChange={(e) => setThresholdKRW(Number(e.target.value))}
          >
            <option value={1000000}>≥ 100만</option>
            <option value={10000000}>≥ 1,000만</option>
            <option value={100000000}>≥ 1억</option>
          </select>
          <button 
            className={styles.iconBtn}
            onClick={() => setCurrencyMode(prev => prev === 'KRW' ? 'USD' : 'KRW')}
          >
            {currencyMode}
          </button>
        </div>
      </div>

      <StatsBanner trades={trades} />

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.4rem', scrollbarWidth: 'none' }}>
        <AnimatePresence initial={false}>
          {trades.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
              <Activity size={32} className={styles.spin} />
              <span style={{ fontSize: '0.8rem', fontWeight: 800, marginTop: '1rem' }}>시그널 분석 중...</span>
            </div>
          ) : (
            trades.map(t => <TradeRow key={t.id} t={t} currencyMode={currencyMode} />)
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
