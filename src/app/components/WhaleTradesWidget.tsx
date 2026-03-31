'use client';
// 개별 거래 항목을 별도의 메모 컴포넌트로 분리하여 재렌더링 최적화
const TradeRow = memo(({ t, formatValue }: { t: Trade, formatValue: (k: number, u: number) => string }) => {
  const isBuy = !t.isBuyerMaker;
  const color = isBuy ? '#22c55e' : '#ef4444';
  const glow = isBuy ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)';
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.8 }}
      style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        background: 'rgba(255, 255, 255, 0.02)', borderLeft: `3px solid ${color}`,
        padding: '0.8rem 1rem', borderRadius: '4px 12px 12px 4px',
        boxShadow: `0 4px 15px ${glow}`,
        marginBottom: '2px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.03)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#64748b', letterSpacing: '0.1em' }}>BINANCE DATA</span>
          <span style={{ fontSize: '0.55rem', color: isBuy ? '#22c55e' : '#ef4444', fontWeight: 900, background: isBuy ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)', padding: '0.1rem 0.35rem', borderRadius: '2px' }}>
            {isBuy ? 'LONG INFLOW' : 'SHORT OUTFLOW'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.15rem' }}>
          <span style={{ fontSize: '1.05rem', fontWeight: 950, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            {t.symbol.replace('USDT', '')}
          </span>
          <span className="terminal-text" style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 650 }}>
            <Clock size={10} style={{ display: 'inline', marginRight: '3px', opacity: 0.5 }} />
            {new Date(t.time).toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
        <div className="terminal-text" style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8' }}>
          ${t.price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <motion.div 
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{ width: 5, height: 5, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} 
          />
          <span style={{ 
            fontSize: '1.15rem', fontWeight: 950, color: color,
            fontFamily: 'var(--font-mono)', letterSpacing: '-0.04em'
          }}>
            {formatValue(t.krwValue, t.usdValue)}
          </span>
        </div>
      </div>
    </motion.div>
  );
});

TradeRow.displayName = 'TradeRow';

export default function WhaleTradesWidget() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [thresholdKRW, setThresholdKRW] = useState<number>(1000000); // 디폴트 100만원으로 상향하여 데이터 부하 감소
  const [currencyMode, setCurrencyMode] = useState<'KRW' | 'USD' | 'BOTH'>('KRW');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [volume, setVolume] = useState(0.5);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContext = useRef<AudioContext | null>(null);

  // 100만, 1000만, 1억, 10억
  const thresholds = [
    { label: '10만원', value: 100000 },
    { label: '100만원', value: 1000000 },
    { label: '1,000만원', value: 10000000 },
    { label: '1억원', value: 100000000 },
    { label: '10억원', value: 1000000000 }
  ];

  const playBeep = useCallback((isBuy: boolean) => {
    if (!soundEnabled) return;
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContext.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    const scaledVolume = volume * 0.1;
    if (scaledVolume <= 0) return;
    
    if (isBuy) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.1);
    } else {
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
  }, [soundEnabled, volume]);

  const thresholdRef = useRef(thresholdKRW);
  useEffect(() => {
    thresholdRef.current = thresholdKRW;
  }, [thresholdKRW]);

  useEffect(() => {
    const connectWS = () => {
      const streams = SYMBOLS.map(s => `${s}@aggTrade`).join('/');
      const ws = new WebSocket(`wss://fstream.binance.com/stream?streams=${streams}`);
      
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (!payload.data) return;
          
          const data = payload.data;
          const price = parseFloat(data.p);
          const qty = parseFloat(data.q);
          const usdValue = price * qty;
          const krwValue = usdValue * USD_KRW_RATE;
          
          if (krwValue >= thresholdRef.current) {
            const trade: Trade = {
              id: `${data.s}-${data.a}-${data.T}`,
              symbol: data.s,
              price,
              qty,
              usdValue,
              krwValue,
              isBuyerMaker: data.m,
              time: data.T,
              isFutures: true
            };
            
            setTrades(prev => {
              if (prev.some(p => p.id === trade.id)) return prev;
              const newTrades = [trade, ...prev].slice(0, 20); 
              playBeep(!data.m); 
              return newTrades;
            });
          }
        } catch (err) {
          console.error("WS Message Error:", err);
        }
      };
      
      ws.onclose = () => {
        setTimeout(connectWS, 3000);
      };
      wsRef.current = ws;
    };
    
    connectWS();
    
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (audioContext.current) audioContext.current.close();
    };
  }, [playBeep]); 

  const formatValue = useCallback((krw: number, usd: number) => {
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
  }, [currencyMode]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={styles.widgetPanel} 
      style={{ 
        display: 'flex', flexDirection: 'column', 
        height: '450px', 
        minHeight: '450px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Zap size={18} style={{ color: '#f59e0b' }} />
          <h3 className={styles.widgetHeader} style={{ marginBottom: 0 }}>라이브 오더 플로우</h3>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div className={styles.actionGroup}>
            <button 
              onClick={() => setCurrencyMode(c => c === 'KRW' ? 'USD' : c === 'USD' ? 'BOTH' : 'KRW')}
              className={styles.iconBtn}
              title="통화 변경"
            >
              <span style={{ fontSize: '0.65rem', fontWeight: 900 }}>{currencyMode}</span>
            </button>
            
            <select 
              value={thresholdKRW} 
              onChange={(e) => setThresholdKRW(Number(e.target.value))}
              className={styles.minimalSelect}
            >
              {thresholds.map(t => <option key={t.value} value={t.value}>≥ {t.label}</option>)}
            </select>
            
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)} 
              className={`${styles.iconBtn} ${soundEnabled ? styles.activeIconBtn : ''}`}
            >
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
          </div>
        </div>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.2rem', scrollbarWidth: 'none' }}>
        <AnimatePresence initial={false}>
          {trades.length === 0 ? (
            <motion.div 
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}
            >
              <RefreshCcw size={24} className={styles.spin} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <div style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em' }}>시그널 대기 중...</div>
            </motion.div>
          ) : (
            trades.map((t) => (
              <TradeRow key={t.id} t={t} formatValue={formatValue} />
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
