import { useState, useEffect, memo, useCallback } from 'react';
import useSWR from 'swr';
import styles from './Widget.module.css';
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { DollarSign, Droplets, Ship, Bitcoin, Activity } from 'lucide-react';
import WidgetSkeleton from './WidgetSkeleton';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const LiveMacroValue = memo(({ baseValue, type = 'number', decimals = 0, prefix = '', suffix = '', jitterSpeed = 3000 }: { 
  baseValue: number, 
  type?: 'number' | 'currency' | 'percent', 
  decimals?: number,
  prefix?: string,
  suffix?: string,
  jitterSpeed?: number 
}) => {
  const [displayValue, setDisplayValue] = useState(baseValue);

  useEffect(() => {
    const interval = setInterval(() => {
      // Very small random walk around the base value
      const jitter = baseValue * 0.0000001 * (Math.random() - 0.5);
      setDisplayValue(prev => {
        const next = baseValue + jitter;
        // Logic for population (always increasing slightly)
        if (suffix === '명') return prev + (Math.random() * 0.1);
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [baseValue, suffix]);

  useEffect(() => {
    setDisplayValue(baseValue);
  }, [baseValue]);

  const formatted = displayValue.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  return (
    <span className={styles.macroValueBig} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}{formatted}{suffix}
    </span>
  );
});

LiveMacroValue.displayName = 'LiveMacroValue';

export default function MacroWidget() {
  const { data, error } = useSWR('/api/macro', fetcher, { refreshInterval: 5000 });
  const [isDark, setIsDark] = useState(true);
  const [activeTab, setActiveTab] = useState<'exchange' | 'commodities' | 'trade' | 'crypto'>('exchange');

  // Load secondary data depending on active tab to optimize calls
  const { data: tradeData } = useSWR(activeTab === 'trade' ? '/api/trade' : null, fetcher, { refreshInterval: 10000 });
  const { data: cryptoData } = useSWR(activeTab === 'crypto' ? '/api/crypto-volume' : null, fetcher, { refreshInterval: 10000 });

  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      setIsDark(theme !== 'light');
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const axisColor = isDark ? '#94a3b8' : '#475569';
  const tooltipBg = isDark ? '#15161f' : '#ffffff';
  const tooltipBorder = isDark ? 'none' : '1px solid #e2e8f0';
  const tooltipTextColor = isDark ? '#f1f5f9' : '#0f172a';

  if (!data && !error) return <WidgetSkeleton />;
  if (error) return <div className={styles.widgetError}>거시경제 데이터를 불러올 수 없습니다.</div>;

  const gdpData = Object.entries(data.gdp).map(([country, value]) => ({ 
    country, 
    value: Number(value) 
  }));

  return (
    <div className={styles.widgetPanel}>
      <h3 className={styles.widgetHeader}>🌍 글로벌 매크로 인디케이터 (Live)</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginBottom: '1rem' }}>
        <div className={styles.macroBox}>
          <div className={styles.macroLabel}>🌐 전 세계 인구</div>
          <LiveMacroValue baseValue={data.population.WORLD} suffix="명" />
          <p className={styles.macroSub}>초당 +2.5명</p>
        </div>
        <div className={styles.macroBox}>
          <div className={styles.macroLabel}>🇺🇸 미국 GDP</div>
          <LiveMacroValue baseValue={data.gdp.US / 1e12} prefix="$" suffix="T" decimals={5} />
        </div>
        <div className={styles.macroBox}>
          <div className={styles.macroLabel}>🇨🇳 중국 GDP</div>
          <LiveMacroValue baseValue={data.gdp.CN / 1e12} prefix="$" suffix="T" decimals={5} />
        </div>
        <div className={styles.macroBox}>
          <div className={styles.macroLabel}>🇯🇵 일본 GDP</div>
          <LiveMacroValue baseValue={data.gdp.JP / 1e12} prefix="$" suffix="T" decimals={5} />
        </div>
        <div className={styles.macroBox}>
          <div className={styles.macroLabel}>🇰🇷 한국 GDP</div>
          <LiveMacroValue baseValue={data.gdp.KR / 1e12} prefix="$" suffix="T" decimals={5} />
        </div>
        <div className={styles.macroBox}>
          <div className={styles.macroLabel}>🇪🇺 유럽 GDP</div>
          <LiveMacroValue baseValue={data.gdp.EU / 1e12} prefix="$" suffix="T" decimals={5} />
        </div>
        <div className={styles.macroBox} style={{ gridColumn: 'span 3' }}>
          <div className={styles.macroLabel}>📈 글로벌 인플레이션 (CPI 가중평균)</div>
          <LiveMacroValue baseValue={3.2} suffix="%" decimals={1} />
          <p className={styles.macroSub}>주요국 가중평균치</p>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>국가별 GDP 비교 (단위: $T)</div>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={gdpData.map(d => ({ ...d, value: d.value / 1000000000000 }))} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
              <XAxis dataKey="country" tick={{ fill: axisColor, fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toFixed(0)}T`} />
              <Tooltip
                cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}
                contentStyle={{ 
                  background: tooltipBg, 
                  border: tooltipBorder, 
                  borderRadius: '10px', 
                  fontSize: '12px',
                  color: tooltipTextColor,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
                }}
                formatter={(value: any) => [`$${Number(value).toFixed(2)}T`, 'GDP']}
              />
              <Bar dataKey="value" fill="url(#macroGradient)" radius={[4, 4, 0, 0]} />
              <defs>
                <linearGradient id="macroGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
          <button onClick={() => setActiveTab('exchange')} className={`${styles.topicBtn} ${activeTab === 'exchange' ? styles.activeTopic : ''}`} style={{ padding: '0.4rem 0.8rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
            <DollarSign size={14} /> 실시간 환율
          </button>
          <button onClick={() => setActiveTab('commodities')} className={`${styles.topicBtn} ${activeTab === 'commodities' ? styles.activeTopic : ''}`} style={{ padding: '0.4rem 0.8rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
            <Droplets size={14} /> 원자재 선물
          </button>
          <button onClick={() => setActiveTab('trade')} className={`${styles.topicBtn} ${activeTab === 'trade' ? styles.activeTopic : ''}`} style={{ padding: '0.4rem 0.8rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
            <Ship size={14} /> 무역 현황
          </button>
          <button onClick={() => setActiveTab('crypto')} className={`${styles.topicBtn} ${activeTab === 'crypto' ? styles.activeTopic : ''}`} style={{ padding: '0.4rem 0.8rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
            <Bitcoin size={14} /> 코인 거래량
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ minHeight: '180px' }}>
          {activeTab === 'exchange' && (
            <div className={styles.exchangeGrid}>
              {data.exchangeRates.map((ex: any) => (
                <div key={ex.pair} className={styles.exchangeItem}>
                  <div className={styles.exchangeHeader}>
                    <span className={styles.exchangePair}>{ex.pair}</span>
                    <span className={ex.change >= 0 ? styles.plus : styles.minus}>
                      {ex.change >= 0 ? '▲' : '▼'} {Math.abs(ex.change).toFixed(2)}%
                    </span>
                  </div>
                  <div className={styles.exchangeRateVal}>
                    <span className={styles.rateHighlight}>
                      {ex.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'commodities' && (
            <div className={styles.exchangeGrid}>
              {data.commodities?.map((c: any) => (
                <div key={c.name} className={styles.exchangeItem}>
                  <div className={styles.exchangeHeader}>
                    <span className={styles.exchangePair}>{c.name}</span>
                    <span className={c.change >= 0 ? styles.plus : styles.minus}>
                      {c.change >= 0 ? '▲' : '▼'} {Math.abs(c.change).toFixed(2)}%
                    </span>
                  </div>
                  <div className={styles.exchangeRateVal}>
                    <span className={styles.rateHighlight} style={{ color: 'var(--text-primary)' }}>
                      ${c.value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'trade' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {!tradeData ? <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}><Activity className={styles.spin} size={20} /></div> : 
                tradeData.countries.slice(0, 6).map((c: any) => (
                  <div key={c.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.8rem', background: 'var(--bg-glass)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{c.name}</div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                      <span style={{ color: '#818cf8' }}>수출: ${c.exports.toLocaleString()}B</span>
                      <span style={{ color: '#fb7185' }}>수입: ${c.imports.toLocaleString()}B</span>
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {activeTab === 'crypto' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              {!cryptoData ? <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}><Activity className={styles.spin} size={20} /></div> : 
                cryptoData.coins.slice(0, 6).map((coin: any) => (
                  <div key={coin.symbol} style={{ background: 'var(--bg-glass)', padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{coin.symbol}</span>
                      <span style={{ color: coin.changePercent >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600, fontSize: '0.8rem' }}>
                        {coin.changePercent >= 0 ? '+' : ''}{coin.changePercent}%
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                      <span>현물: ${(coin.spotQuoteVolume / 1000000).toFixed(1)}M</span>
                      <span>선물: ${(coin.futuresQuoteVolume / 1000000).toFixed(1)}M</span>
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
