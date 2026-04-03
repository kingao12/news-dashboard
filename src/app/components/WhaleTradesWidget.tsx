'use client';

import { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { Zap, Volume2, VolumeX, RefreshCcw, Clock, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Widget.module.css';

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
const USD_KRW_RATE = 1512.45;

// ── 개별 거래 행: memo로 불필요한 재렌더링 방지 ────────────────────────────
const TradeRow = memo(({ t, formatValue }: { t: Trade; formatValue: (k: number, u: number) => string }) => {
  const isBuy = !t.isBuyerMaker;
  const color = isBuy ? '#22c55e' : '#ef4444';
  const glow = isBuy ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
  const timeStr = useMemo(
    () => new Date(t.time).toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    [t.time]
  );
  const priceStr = useMemo(
    () => `$${t.price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`,
    [t.price]
  );

  return (
    <>
      <div
        className="trade-row-anim"
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(255,255,255,0.02)', borderLeft: `3px solid ${color}`,
        padding: '0.75rem 1rem', borderRadius: '4px 12px 12px 4px',
        boxShadow: `0 4px 15px ${glow}`, marginBottom: '0.4rem',
        backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.03)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#64748b', letterSpacing: '0.1em' }}>바이낸스</span>
          <span style={{
            fontSize: '0.55rem', color: isBuy ? '#22c55e' : '#ef4444', fontWeight: 900,
            background: isBuy ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            padding: '0.1rem 0.35rem', borderRadius: '3px'
          }}>
            {isBuy ? '▲ 롱 유입' : '▼ 숏 유출'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.1rem' }}>
          <span style={{ fontSize: '1.05rem', fontWeight: 950, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            {t.symbol.replace('USDT', '')}
          </span>
          <span className="terminal-text" style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
            <Clock size={10} style={{ display: 'inline', marginRight: '3px', opacity: 0.5 }} />
            {timeStr}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
        <div className="terminal-text" style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8' }}>
          {priceStr}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 5, height: 5, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }}
          />
          <span style={{ fontSize: '1.1rem', fontWeight: 950, color, fontFamily: 'var(--font-mono)', letterSpacing: '-0.04em' }}>
            {formatValue(t.krwValue, t.usdValue)}
          </span>
        </div>
      </div>
      </div>
    </>
  );
});

TradeRow.displayName = 'TradeRow';

// ── 실시간 통계 미니 패널 ──────────────────────────────────────────────────
const StatsMini = memo(({ trades }: { trades: Trade[] }) => {
  const stats = useMemo(() => {
    if (trades.length === 0) return null;
    const buys = trades.filter(t => !t.isBuyerMaker);
    const sells = trades.filter(t => t.isBuyerMaker);
    const totalKRW = trades.reduce((s, t) => s + t.krwValue, 0);
    const buyRatio = trades.length > 0 ? Math.round((buys.length / trades.length) * 100) : 50;
    return { buyCount: buys.length, sellCount: sells.length, totalKRW, buyRatio };
  }, [trades]);

  const formatTotal = (v: number) => {
    if (v >= 1e12) return `${(v / 1e12).toFixed(1)}조`;
    if (v >= 1e8) return `${(v / 1e8).toFixed(1)}억`;
    if (v >= 1e4) return `${(v / 1e4).toFixed(0)}만`;
    return `${v.toFixed(0)}`;
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem', height: '62px', alignItems: 'center' }}>
      {!stats ? (
        <div style={{ flex: 1, height: '100%', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.6rem', color: '#475569', fontWeight: 700 }}>실시간 데이터 수집 중...</span>
        </div>
      ) : (
        <>
          {/* 매수/매도 비율 바 */}
          <div style={{ flex: 2, background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.5rem 0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, marginBottom: '0.3rem', letterSpacing: '0.05em' }}>매수/매도 비율</div>
            <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', background: 'rgba(239,68,68,0.3)' }}>
              <motion.div
                style={{ background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: '3px 0 0 3px' }}
                animate={{ width: `${stats.buyRatio}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
              <span style={{ fontSize: '0.62rem', color: '#22c55e', fontWeight: 800 }}>↑ {stats.buyCount}</span>
              <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>{stats.buyRatio}%</span>
              <span style={{ fontSize: '0.62rem', color: '#ef4444', fontWeight: 800 }}>{stats.sellCount} ↓</span>
            </div>
          </div>

          {/* 누적 거래량 */}
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.5rem 0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, marginBottom: '0.2rem', letterSpacing: '0.05em' }}>누적 거래량</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
              {formatTotal(stats.totalKRW)}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

StatsMini.displayName = 'StatsMini';

// ── 메인 위젯 ───────────────────────────────────────────────────────────────
export default function WhaleTradesWidget() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [thresholdKRW, setThresholdKRW] = useState<number>(1000000);
  const [currencyMode, setCurrencyMode] = useState<'KRW' | 'USD' | 'BOTH'>('KRW');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [volume] = useState(0.5);
  const [symbolFilter, setSymbolFilter] = useState<string>('ALL');
  const [wsStatus, setWsStatus] = useState<'connecting' | 'live' | 'error'>('connecting');

  const wsRef = useRef<WebSocket | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  // ① 버퍼: WebSocket 메시지를 모아서 500ms마다 한 번에 setState
  const tradeBuffer = useRef<Trade[]>([]);
  const thresholdRef = useRef(thresholdKRW);

  useEffect(() => { thresholdRef.current = thresholdKRW; }, [thresholdKRW]);

  const thresholds = [
    { label: '10만원', value: 100000 },
    { label: '100만원', value: 1000000 },
    { label: '1,000만원', value: 10000000 },
    { label: '1억원', value: 100000000 },
    { label: '10억원', value: 1000000000 },
  ];

  const playBeep = useCallback((isBuy: boolean) => {
    if (!soundEnabled) return;
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContext.current;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const v = volume * 0.1;
    if (v <= 0) return;
    osc.type = isBuy ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(isBuy ? 1000 : 400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(isBuy ? 1500 : 250, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(v, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.15);
  }, [soundEnabled, volume]);

  // ② 스로틀 인터벌: 버퍼 → 상태 반영 (500ms)
  useEffect(() => {
    const interval = setInterval(() => {
      if (tradeBuffer.current.length === 0) return;
      const incoming = tradeBuffer.current.splice(0);
      setTrades(prev => {
        const seenIds = new Set(prev.map(t => t.id));
        const newOnes = incoming.filter(t => !seenIds.has(t.id));
        if (newOnes.length === 0) return prev;
        return [...newOnes, ...prev].slice(0, 5);
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // ③ WebSocket 연결
  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let mounted = true;

    const connect = () => {
      if (!mounted) return;
      setWsStatus('connecting');
      const streams = SYMBOLS.map(s => `${s.toLowerCase()}@aggTrade`).join('/');
      const ws = new WebSocket(`wss://fstream.binance.com/stream?streams=${streams}`);
      wsRef.current = ws;

      ws.onopen = () => { if (mounted) setWsStatus('live'); };

      ws.onmessage = (event) => {
        try {
          const { data } = JSON.parse(event.data);
          if (!data) return;
          const price = parseFloat(data.p);
          const qty = parseFloat(data.q);
          const usdValue = price * qty;
          const krwValue = usdValue * USD_KRW_RATE;
          if (krwValue < thresholdRef.current) return;

          const trade: Trade = {
            id: `${data.s}-${data.a}-${data.T}`,
            symbol: data.s, price, qty, usdValue, krwValue,
            isBuyerMaker: data.m, time: data.T, isFutures: true,
          };
          tradeBuffer.current.push(trade);
          playBeep(!data.m);
        } catch { /* 무시 */ }
      };

      ws.onerror = () => { if (mounted) setWsStatus('error'); };
      ws.onclose = () => {
        if (mounted) {
          setWsStatus('error');
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    };

    connect();
    return () => {
      mounted = false;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
      audioContext.current?.close();
    };
  }, [playBeep]);

  const formatValue = useCallback((krw: number, usd: number): string => {
    switch (currencyMode) {
      case 'KRW':
        if (krw >= 1e8) return `${(krw / 1e8).toFixed(1)}억`;
        if (krw >= 1e7) return `${(krw / 1e7).toFixed(1)}천만`;
        return `${(krw / 1e4).toFixed(0)}만`;
      case 'USD':
        return usd >= 1000 ? `$${(usd / 1000).toFixed(1)}K` : `$${usd.toFixed(0)}`;
      case 'BOTH':
        const k = krw >= 1e8 ? `${(krw / 1e8).toFixed(1)}억` : `${(krw / 1e4).toFixed(0)}만`;
        const u = usd >= 1000 ? `$${(usd / 1000).toFixed(1)}K` : `$${usd.toFixed(0)}`;
        return `${k} (${u})`;
      default: return '';
    }
  }, [currencyMode]);

  const filteredTrades = useMemo(() =>
    symbolFilter === 'ALL' ? trades : trades.filter(t => t.symbol === symbolFilter),
    [trades, symbolFilter]
  );

  const statusColor = wsStatus === 'live' ? '#22c55e' : wsStatus === 'connecting' ? '#f59e0b' : '#ef4444';
  const statusLabel = wsStatus === 'live' ? '라이브' : wsStatus === 'connecting' ? '연결 중' : '재연결 중';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={styles.widgetPanel}
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '400px' }}
    >
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'nowrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <Zap size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <h3 className={styles.widgetHeader} style={{ marginBottom: 0, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>라이브 오더 플로우</h3>
          {/* WS 연결 상태 뱃지 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '2px 8px', border: `1px solid ${statusColor}33`, flexShrink: 0 }}>
            <motion.div
              animate={{ opacity: wsStatus === 'live' ? [0.5, 1, 0.5] : 1 }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }}
            />
            <span style={{ fontSize: '0.58rem', fontWeight: 800, color: statusColor, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{statusLabel}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          {/* 심볼 필터 */}
          <select
            value={symbolFilter}
            onChange={e => setSymbolFilter(e.target.value)}
            className={styles.minimalSelect}
            style={{ fontSize: '0.6rem' }}
          >
            <option value="ALL">전체</option>
            {SYMBOLS.map(s => <option key={s} value={s}>{s.replace('USDT', '')}</option>)}
          </select>

          <div className={styles.actionGroup}>
            <button
              onClick={() => setCurrencyMode(c => c === 'KRW' ? 'USD' : c === 'USD' ? 'BOTH' : 'KRW')}
              className={styles.iconBtn} title="통화 변경"
            >
              <span style={{ fontSize: '0.62rem', fontWeight: 900 }}>{currencyMode}</span>
            </button>
            <select
              value={thresholdKRW}
              onChange={e => setThresholdKRW(Number(e.target.value))}
              className={styles.minimalSelect}
            >
              {thresholds.map(t => <option key={t.value} value={t.value}>≥ {t.label}</option>)}
            </select>
            <button
              onClick={() => setSoundEnabled(v => !v)}
              className={`${styles.iconBtn} ${soundEnabled ? styles.activeIconBtn : ''}`}
            >
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* 실시간 통계 미니 패널 (항상 렌더링하여 높이 고정) */}
      <StatsMini trades={trades} />

      {/* 거래 목록 */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.4rem', 
        paddingRight: '0.2rem', 
        scrollbarWidth: 'none',
        contain: 'content' 
      }}>
        {filteredTrades.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
            <RefreshCcw size={24} className={styles.spin} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <div style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em' }}>
              {wsStatus === 'connecting' ? '연결 중...' : '시그널 대기 중...'}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '0.4rem' }}>
              임계값: {thresholdKRW.toLocaleString()}원 이상
            </div>
          </div>
        ) : (
          filteredTrades.map(t => (
            <TradeRow key={t.id} t={t} formatValue={formatValue} />
          ))
        )}
      </div>
    </motion.div>
  );
}
