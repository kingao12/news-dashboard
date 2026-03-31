import { memo, useMemo } from 'react';
import useSWR from 'swr';
import styles from './Widget.module.css';
import WidgetSkeleton from './WidgetSkeleton';
import { Globe, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('API Error');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
};

const fmtB = (v: number) => `$${v.toLocaleString()}B`;

const CountryTradeRow = memo(({ c, i, maxExport }: { c: any, i: number, maxExport: number }) => {
  const isSurplus = c.balance >= 0;
  const exportPct = (c.exports / maxExport) * 100;
  const importPct = (c.imports / maxExport) * 100;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.04 }}
      style={{
        background: 'rgba(255,255,255,0.015)', 
        borderRadius: '6px',
        padding: '0.7rem 0.6rem',
        border: '1px solid rgba(255,255,255,0.02)',
        marginBottom: '2px'
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 80px', gap: '0.8rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
          <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700 }}>{c.code} {c.tradeGDP}%</span>
        </div>
        
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#22c55e', fontFamily: 'var(--font-mono)' }}>{fmtB(c.exports)}</span>
          </div>
          <div style={{ height: '3px', borderRadius: '1.5px', background: 'rgba(255,255,255,0.03)', overflow: 'hidden' }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${exportPct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{ height: '100%', background: '#22c55e', boxShadow: '0 0 5px rgba(34,197,94,0.3)' }} 
            />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>{fmtB(c.imports)}</span>
          </div>
          <div style={{ height: '3px', borderRadius: '1.5px', background: 'rgba(255,255,255,0.03)', overflow: 'hidden' }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${importPct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{ height: '100%', background: '#ef4444', boxShadow: '0 0 5px rgba(239,68,68,0.3)' }} 
            />
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.1rem', fontSize: '0.75rem', fontWeight: 950, color: isSurplus ? '#22c55e' : '#ef4444', fontFamily: 'var(--font-mono)' }}>
            {isSurplus ? '+' : ''}{fmtB(c.balance)}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

CountryTradeRow.displayName = 'CountryTradeRow';

export default function TradeWidget() {
  const { data, error } = useSWR('/api/trade', fetcher, { 
    refreshInterval: 15000,
    dedupingInterval: 5000
  });

  const maxExport = useMemo(() => {
    if (!data?.countries) return 0;
    return Math.max(...data.countries.map((x: any) => x.exports));
  }, [data]);

  if (error) return <div className={styles.widgetError}>무역 데이터 로드 실패</div>;
  if (!data) return <WidgetSkeleton />;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={styles.widgetPanel}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Globe size={18} style={{ color: 'var(--accent-primary)' }} />
          <h3 className={styles.widgetHeader} style={{ marginBottom: 0 }}>글로벌 무역 터미널</h3>
        </div>
        <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 950, background: 'rgba(255,255,255,0.04)', padding: '0.2rem 0.6rem', borderRadius: '4px', letterSpacing: '0.04em', border: '1px solid rgba(255,255,255,0.05)' }}>
          UNIT: $BN (USD)
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 80px', gap: '0.8rem', padding: '0 0.6rem 0.4rem 0.6rem', fontSize: '0.55rem', color: '#64748b', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          <span>Region</span>
          <span>Exports</span>
          <span>Imports</span>
          <span style={{ textAlign: 'right' }}>Balance</span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', maxHeight: '380px', overflowY: 'auto', scrollbarWidth: 'none' }}>
          {data.countries.map((c: any, i: number) => (
            <CountryTradeRow key={c.code} c={c} i={i} maxExport={maxExport} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
