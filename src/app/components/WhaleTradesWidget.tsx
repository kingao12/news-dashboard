'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import styles from './Widget.module.css';
import { Send, Settings, Volume2, VolumeX, RefreshCcw } from 'lucide-react';

const SYMBOLS = ['btcusdt', 'ethusdt', 'solusdt', 'xrpusdt', 'dogeusdt'];
const USD_KRW_RATE = 1400; // 근사치 환율 하드코딩 (필요시 전역 상태 이용)

type Trade = {
  id: string;
  symbol: string;
  price: number;
  qty: number;
  usdValue: number;
  krwValue: number;
  isBuyerMaker: boolean;
  time: number;
  isFutures: boolean;
};

export default function WhaleTradesWidget() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [thresholdKRW, setThresholdKRW] = useState<number>(1000000); // 디폴트 100만원
  const [currencyMode, setCurrencyMode] = useState<'KRW' | 'USD' | 'BOTH'>('KRW');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [volume, setVolume] = useState(0.5);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContext = useRef<AudioContext | null>(null);

  // 100만, 1000만, 1억, 10억
  const thresholds = [
    { label: '100만원', value: 1000000 },
    { label: '1,000만원', value: 10000000 },
    { label: '1억원', value: 100000000 },
    { label: '10억원', value: 1000000000 }
  ];

  const playBeep = (isBuy: boolean) => {
    if (!soundEnabled) return;
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContext.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    const scaledVolume = volume * 0.15; // 최대 볼륨 배율을 (0.6 -> 0.15)로 대폭 낮춰 귀가 아프지 않게 최적화
    if (scaledVolume <= 0) return; // 볼륨이 0일 경우 재생하지 않음
    
    if (isBuy) {
      // 매수(롱) 사운드: 경쾌하고 높은 핑음
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.1);
    } else {
      // 매도(숏) 사운드: 무겁고 낮은 툭음
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.15);
    }
    
    gainNode.gain.setValueAtTime(scaledVolume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  };

  useEffect(() => {
    const connectWS = () => {
      // Binance Futures Aggregate Trade Streams
      const streams = SYMBOLS.map(s => `${s}@aggTrade`).join('/');
      const ws = new WebSocket(`wss://fstream.binance.com/stream?streams=${streams}`);
      
      ws.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        if (!payload.data) return;
        
        const data = payload.data;
        // e: event type, s: symbol, p: price, q: quantity, m: is Buyer Maker
        const price = parseFloat(data.p);
        const qty = parseFloat(data.q);
        const usdValue = price * qty;
        const krwValue = usdValue * USD_KRW_RATE;
        
        // threshold 체크 (선택한 금액 이상일 때만 표시)
        // state에서 읽어와야 하지만 클로저 문제로 setState 함수 형태 이용
        setThresholdKRW(currThreshold => {
          if (krwValue >= currThreshold) {
            const trade: Trade = {
              id: `${data.s}-${data.a}`,
              symbol: data.s,
              price,
              qty,
              usdValue,
              krwValue,
              isBuyerMaker: data.m,
              time: data.T,
              isFutures: true // fstream is futures
            };
            
            setTrades(prev => {
              const newTrades = [trade, ...prev].slice(0, 10); // 10개 유지
              playBeep(!data.m); // m이 true면 seller가 hit 한거라 매도(숏), false면 buyer가 hit한거라 매수(롱)
              return newTrades;
            });
          }
          return currThreshold;
        });
      };
      
      ws.onclose = () => {
        setTimeout(connectWS, 3000); // 자동 재접속
      };
      wsRef.current = ws;
    };
    
    connectWS();
    
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (audioContext.current) audioContext.current.close();
    };
  }, [soundEnabled]); // playBeep takes soundEnabled directly, but reconnecting might be heavy. Let's just decouple it if possible, but it's simpler this way.

  const formatValue = (krw: number, usd: number) => {
    switch(currencyMode) {
      case 'KRW':
        if (krw >= 100000000) return `${(krw / 100000000).toFixed(1)}억`;
        if (krw >= 10000000) return `${(krw / 10000000).toFixed(1)}천만`;
        return `${(krw / 10000).toFixed(0)}만`;
      case 'USD':
        if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}K`;
        return `$${usd.toFixed(0)}`;
      case 'BOTH':
        const kStr = krw >= 100000000 ? `${(krw / 100000000).toFixed(1)}억` : `${(krw / 10000).toFixed(0)}만`;
        const uStr = usd >= 1000 ? `$${(usd / 1000).toFixed(1)}K` : `$${usd.toFixed(0)}`;
        return `${kStr} (${uStr})`;
    }
  };

  return (
    <div className={styles.widgetPanel} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 className={styles.widgetHeader} style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Send size={16} color="#3b82f6" /> 실시간 고래 체결 내역
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <button 
            onClick={() => setCurrencyMode(c => c === 'KRW' ? 'USD' : c === 'USD' ? 'BOTH' : 'KRW')}
            style={{ filter: 'brightness(1.5)', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
          >
            {currencyMode === 'KRW' ? '원화' : currencyMode === 'USD' ? '달러' : '원/달러'}
          </button>
          
          <div style={{ position: 'relative' }}>
            <select 
              value={thresholdKRW} 
              onChange={(e) => setThresholdKRW(Number(e.target.value))}
              style={{ background: 'var(--bg-glass)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', outline: 'none' }}
            >
              {thresholds.map(t => <option key={t.value} value={t.value} style={{ background: '#1e293b', color: '#f8fafc' }}>≥ {t.label}</option>)}
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {soundEnabled && (
              <input 
                type="range" min="0" max="1" step="0.05" 
                value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
                style={{ width: '50px', accentColor: '#22c55e', cursor: 'pointer' }}
                title={`볼륨 조절 (${Math.round(volume * 100)}%)`}
              />
            )}
            <button onClick={() => setSoundEnabled(!soundEnabled)} style={{ background: 'transparent', border: 'none', color: soundEnabled ? '#22c55e' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}>
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </div>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: '0.2rem' }}>
        {trades.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '150px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <RefreshCcw size={20} className={styles.spin} style={{ marginBottom: '0.5rem' }} />
            고래 체결을 기다리는 중...
          </div>
        ) : (
          trades.map((t, idx) => {
            // isBuyerMaker: true means seller hit the bid (sell market order) => Red
            // isBuyerMaker: false means buyer hit the ask (buy market order) => Green
            const isBuy = !t.isBuyerMaker;
            const color = isBuy ? '#22c55e' : '#ef4444';
            const bgLight = isBuy ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';
            const borderLight = isBuy ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
            
            return (
              <div key={t.id + idx} style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                background: bgLight, border: `1px solid ${borderLight}`,
                padding: '0.6rem 0.8rem', borderRadius: '8px',
                animation: 'slideDown 0.3s ease-out'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f59e0b' }}>
                      BINANCE
                    </span>
                    <span style={{ fontSize: '0.7rem', background: '#334155', color: 'white', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
                      FUTURES
                    </span>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {t.symbol.replace('USDT', '')}
                  </span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    ${t.price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                  </span>
                  
                  <span style={{ 
                    fontSize: '1rem', fontWeight: 900, color: color,
                    minWidth: '60px', textAlign: 'right'
                  }}>
                    {isBuy ? '▲' : '▼'} {formatValue(t.krwValue, t.usdValue)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
