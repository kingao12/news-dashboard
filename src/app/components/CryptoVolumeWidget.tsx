import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import styles from './Widget.module.css';
import WidgetSkeleton from './WidgetSkeleton';
import { BarChart3, TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('API Error');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
};

const fmt = (v: number): string => {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toFixed(2)}`;
};

const LivePrice = ({ basePrice, symbol, className }: { basePrice: number, symbol: string, className?: string }) => {
  const [price, setPrice] = useState(basePrice);
  const [flashClass, setFlashClass] = useState('');
  const prevPrice = useRef(basePrice);

  useEffect(() => {
    const handlePriceUpdate = (e: any) => {
      if (e.detail.symbol === symbol) {
        const newPrice = e.detail.price;
        if (newPrice > prevPrice.current) setFlashClass('price-flash-up');
        else if (newPrice < prevPrice.current) setFlashClass('price-flash-down');
        
        setPrice(newPrice);
        prevPrice.current = newPrice;
        
        setTimeout(() => setFlashClass(''), 800);
      }
    };
    window.addEventListener('binance-price-update', handlePriceUpdate);
    return () => window.removeEventListener('binance-price-update', handlePriceUpdate);
  }, [symbol]);

  return (
    <span className={`${className} ${flashClass} terminal-text`}>
      ${price >= 1000 ? Math.round(price).toLocaleString() : price.toFixed(2)}
    </span>
  );
};

export default function CryptoVolumeWidget() {
  const { data, error } = useSWR('/api/crypto-volume', fetcher, { refreshInterval: 10000 });
  
  if (error) return <div className={styles.widgetError}>거래량 데이터 로드 실패</div>;
  if (!data) return <WidgetSkeleton />;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={styles.widgetPanel}
      style={{ 
        height: '450px', // 고정 높이 설정으로 밀림 방지
        minHeight: '450px',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <BarChart3 size={18} style={{ color: 'var(--accent-primary)' }} />
          <h3 className={styles.widgetHeader} style={{ marginBottom: 0 }}>코인 볼륨 익스체인지</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 900, padding: '0.2rem 0.5rem', background: 'rgba(34,197,94,0.05)', color: '#22c55e', borderRadius: '4px', border: '1px solid rgba(34,197,94,0.1)' }}>SPOT</div>
          <div style={{ fontSize: '0.6rem', fontWeight: 900, padding: '0.2rem 0.5rem', background: 'rgba(99,102,241,0.05)', color: '#818cf8', borderRadius: '4px', border: '1px solid rgba(99,102,241,0.1)' }}>PERP</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginBottom: '1.2rem' }}>
        {[
          { label: '현물 24H', value: fmt(data.summary.totalSpotVolume), color: '#22c55e' },
          { label: '선물 24H', value: fmt(data.summary.totalFuturesVolume), color: '#8b5cf6' },
          { label: 'TOTAL', value: fmt(data.summary.totalCombinedVolume), color: '#f59e0b' },
        ].map(item => (
          <motion.div 
            key={item.label} 
            whileHover={{ y: -2 }}
            style={{ 
              background: 'var(--bg-glass)', 
              borderRadius: '12px', 
              padding: '0.75rem', 
              border: '1px solid var(--border-glass)', 
              textAlign: 'center',
              boxShadow: `0 4px 10px rgba(0,0,0,0.1)`
            }}
          >
            <div style={{ fontSize: '0.55rem', color: '#64748b', marginBottom: '0.3rem', fontWeight: 900, letterSpacing: '0.05em' }}>{item.label}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 950, color: item.color, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>{item.value}</div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 60px', gap: '1rem', padding: '0 0.5rem 0.5rem 0.5rem', fontSize: '0.6rem', color: '#64748b', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          <span>ASSET / PRICE</span>
          <span>SPOT VOL</span>
          <span>FUTURES</span>
          <span style={{ textAlign: 'right' }}>CHG</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {data.coins.map((coin: any, i: number) => {
            const isUp = coin.changePercent >= 0;
            return (
              <motion.div 
                key={coin.symbol}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 60px',
                  gap: '1rem', padding: '0.7rem 0.5rem', borderRadius: '4px',
                  background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{coin.symbol}</span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    <LivePrice basePrice={coin.price} symbol={coin.symbol} />
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#22c55e', fontWeight: 800 }}>
                  {fmt(coin.spotQuoteVolume)}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#818cf8', fontWeight: 800 }}>
                  {fmt(coin.futuresQuoteVolume)}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem', fontSize: '0.75rem', fontWeight: 900, color: isUp ? '#22c55e' : '#ef4444', fontFamily: 'var(--font-mono)' }}>
                  {isUp ? '+' : ''}{coin.changePercent.toFixed(1)}%
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
