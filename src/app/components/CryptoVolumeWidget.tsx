'use client';
import useSWR from 'swr';
import styles from './Widget.module.css';
import WidgetSkeleton from './WidgetSkeleton';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

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

export default function CryptoVolumeWidget() {
  const { data, error } = useSWR('/api/crypto-volume', fetcher, { refreshInterval: 10000 });
  if (error) return <div className={styles.widgetError}>거래량 데이터 로드 실패</div>;
  if (!data) return <WidgetSkeleton />;

  return (
    <div className={styles.widgetPanel}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 className={styles.widgetHeader} style={{ marginBottom: 0 }}>
          <BarChart3 size={16} /> 코인 실시간 거래량 (현물+선물)
        </h3>
        <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.65rem', fontWeight: 800 }}>
          <span style={{ padding: '0.15rem 0.5rem', background: 'rgba(34,197,94,0.1)', color: '#22c55e', borderRadius: '6px', border: '1px solid rgba(34,197,94,0.2)' }}>현물</span>
          <span style={{ padding: '0.15rem 0.5rem', background: 'rgba(99,102,241,0.1)', color: '#818cf8', borderRadius: '6px', border: '1px solid rgba(99,102,241,0.2)' }}>선물</span>
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginBottom: '1rem' }}>
        {[
          { label: '현물 24h 총거래액', value: fmt(data.summary.totalSpotVolume), color: '#22c55e' },
          { label: '선물 24h 총거래액', value: fmt(data.summary.totalFuturesVolume), color: '#818cf8' },
          { label: '현물+선물 합계', value: fmt(data.summary.totalCombinedVolume), color: '#f59e0b' },
        ].map(item => (
          <div key={item.label} style={{ background: 'var(--bg-glass)', borderRadius: '10px', padding: '0.7rem', border: '1px solid var(--border-glass)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', fontWeight: 700 }}>{item.label}</div>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: item.color, fontFamily: 'monospace' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Per-coin table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '240px', overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '50px 80px 1fr 1fr 60px', gap: '0.5rem', padding: '0.3rem 0.5rem', fontSize: '0.62rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <span>코인</span><span>가격</span><span>현물거래액</span><span>선물거래액</span><span>등락</span>
        </div>
        {data.coins.map((coin: any) => {
          const isUp = coin.changePercent >= 0;
          return (
            <div key={coin.symbol} style={{
              display: 'grid', gridTemplateColumns: '50px 80px 1fr 1fr 60px',
              gap: '0.5rem', padding: '0.5rem', borderRadius: '8px',
              background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
              alignItems: 'center', fontSize: '0.78rem'
            }}>
              <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{coin.symbol}</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.7rem' }}>
                {coin.price >= 1000 ? `$${Math.round(coin.price).toLocaleString()}` : `$${coin.price.toFixed(2)}`}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#22c55e', fontWeight: 700 }}>
                {fmt(coin.spotQuoteVolume)}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#818cf8', fontWeight: 700 }}>
                {fmt(coin.futuresQuoteVolume)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem', fontWeight: 800, color: isUp ? '#22c55e' : '#ef4444' }}>
                {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {isUp ? '+' : ''}{coin.changePercent.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
