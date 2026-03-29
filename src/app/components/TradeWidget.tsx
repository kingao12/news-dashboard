'use client';
import useSWR from 'swr';
import styles from './Widget.module.css';
import WidgetSkeleton from './WidgetSkeleton';
import { Globe, TrendingUp, TrendingDown } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());
const fmtB = (v: number) => `$${v.toLocaleString()}B`;

export default function TradeWidget() {
  const { data, error } = useSWR('/api/trade', fetcher, { refreshInterval: 15000 });
  if (error) return <div className={styles.widgetError}>무역 데이터 로드 실패</div>;
  if (!data) return <WidgetSkeleton />;

  return (
    <div className={styles.widgetPanel}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 className={styles.widgetHeader} style={{ marginBottom: 0 }}>
          <Globe size={16} /> 국가별 무역 현황 (수출·수입)
        </h3>
        <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>연간 기준 ($Billion)</span>
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 80px', gap: '0.4rem', padding: '0.3rem 0.5rem', fontSize: '0.62rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-glass)', marginBottom: '0.5rem' }}>
        <span>국가</span>
        <span>수출 📤</span>
        <span>수입 📥</span>
        <span>무역수지</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '320px', overflowY: 'auto' }}>
        {data.countries.map((c: any) => {
          const isSurplus = c.balance >= 0;
          const maxExport = Math.max(...data.countries.map((x: any) => x.exports));
          const exportPct = (c.exports / maxExport) * 100;
          const importPct = (c.imports / maxExport) * 100;

          return (
            <div key={c.code} style={{
              background: 'var(--bg-glass)', borderRadius: '10px',
              border: '1px solid var(--border-glass)', padding: '0.6rem 0.7rem',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 80px', gap: '0.4rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{c.name}</span>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#22c55e' }}>{fmtB(c.exports)}</span>
                    <span style={{ fontSize: '0.6rem', color: '#64748b' }}>YTD: {fmtB(c.ytdExports)}</span>
                  </div>
                  <div style={{ height: '5px', borderRadius: '9999px', background: 'rgba(255,255,255,0.05)' }}>
                    <div style={{ width: `${exportPct}%`, height: '100%', borderRadius: '9999px', background: '#22c55e', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ef4444' }}>{fmtB(c.imports)}</span>
                    <span style={{ fontSize: '0.6rem', color: '#64748b' }}>YTD: {fmtB(c.ytdImports)}</span>
                  </div>
                  <div style={{ height: '5px', borderRadius: '9999px', background: 'rgba(255,255,255,0.05)' }}>
                    <div style={{ width: `${importPct}%`, height: '100%', borderRadius: '9999px', background: '#ef4444', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem', fontSize: '0.75rem', fontWeight: 900, color: isSurplus ? '#22c55e' : '#ef4444' }}>
                    {isSurplus ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {isSurplus ? '+' : ''}{fmtB(c.balance)}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', marginTop: '2px' }}>{c.tradeGDP}% of GDP</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
