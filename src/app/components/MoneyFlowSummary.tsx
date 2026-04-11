'use client';

import { useEffect, useState, memo, useMemo } from 'react';
import styles from './MoneyFlowSummary.module.css';
import { 
  Activity, Flame, X, BarChart3, Globe, Clock, 
  Coins, Briefcase, Boxes, TrendingUp, ShieldCheck, 
  Info, Sparkles, Zap, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- 확장된 데이터 구조 (Capital Flows 2.0) ---

const CATEGORIES = [
  { id: 'ASSET', label: '자산군', icon: <Boxes size={14}/> },
  { id: 'REGION', label: '국가/지역', icon: <Globe size={14}/> },
  { id: 'SECTOR', label: '섹터', icon: <BarChart3 size={14}/> },
  { id: 'STYLE', label: '스타일', icon: <Activity size={14}/> },
  { id: 'BOND', label: '금리/채권', icon: <TrendingUp size={14}/> },
  { id: 'CRYPTO', label: '크립토', icon: <Coins size={14}/> },
];

const FLOW_DATA: Record<string, any[]> = {
  ASSET: [
    { name: '주식', symbol: 'EQUITY', value: 12500, type: 'in', detail: '가파른 상승세' },
    { name: '채권', symbol: 'BOND', value: -8400, type: 'out', detail: '금리 인상 우려' },
    { name: '현금', symbol: 'CASH', value: 4200, type: 'in', detail: '대기 자금 증가' },
    { name: '금/원자재', symbol: 'GOLD', value: 2100, type: 'in', detail: '헷징 수요 유입' },
    { name: '비트코인', symbol: 'BTC', value: 6800, type: 'in', detail: '기관 매수세 집중' },
    { name: '부동산/리츠', symbol: 'REITs', value: -1200, type: 'out', detail: '이자 부담 지속' },
    { name: '안전자산', symbol: 'RISK-OFF', value: 3100, type: 'in', detail: '방어적 태세' },
    { name: '위험자산', symbol: 'RISK-ON', value: 9200, type: 'in', detail: '성장주 선호' },
  ],
  REGION: [
    { name: '미국', symbol: 'US', value: 18500, type: 'in' },
    { name: '한국', symbol: 'KR', value: 120, type: 'in' },
    { name: '일본', symbol: 'JP', value: 3200, type: 'in' },
    { name: '중국', symbol: 'CN', value: -5400, type: 'out' },
    { name: '유럽', symbol: 'EU', value: 850, type: 'in' },
    { name: '신흥국', symbol: 'EM', value: -1400, type: 'out' },
    { name: '중동', symbol: 'ME', value: 2100, type: 'in' },
  ],
  SECTOR: [
    { name: 'AI/반도체', symbol: 'NVDA', value: 9800, type: 'in' },
    { name: '금융/은행', symbol: 'BANK', value: 4200, type: 'in' },
    { name: '에너지/화학', symbol: 'ENERGY', value: -3100, type: 'out' },
    { name: '방산/우주', symbol: 'DEFENSE', value: 2200, type: 'in' },
    { name: '헬스케어', symbol: 'HLTH', value: -1200, type: 'out' },
    { name: '소비재', symbol: 'CONS', value: 850, type: 'in' },
    { name: '산업재', symbol: 'IND', value: -450, type: 'out' },
    { name: '리츠/부동산', symbol: 'REIT', value: -1800, type: 'out' },
  ],
  STYLE: [
    { name: '성장주', symbol: 'GROWTH', value: 11500, type: 'in' },
    { name: '가치주', symbol: 'VALUE', value: -2200, type: 'out' },
    { name: '대형주', symbol: 'LARGE', value: 8400, type: 'in' },
    { name: '중소형주', symbol: 'SMALL', value: -1200, type: 'out' },
    { name: '고배당', symbol: 'DIVIDEND', value: 3100, type: 'in' },
    { name: '방어주', symbol: 'DEFENSE', value: 4500, type: 'in' },
  ],
  BOND: [
    { name: '단기채', symbol: 'SHORT', value: 9200, type: 'in' },
    { name: '장기채', symbol: 'LONG', value: -15400, type: 'out' },
    { name: '하이일드', symbol: 'HY', value: 3200, type: 'in' },
    { name: '국채(Treasury)', symbol: 'GOV', value: 1200, type: 'in' },
    { name: '투자등급채', symbol: 'IG', value: 2100, type: 'in' },
  ],
  CRYPTO: [
    { name: 'BTC(비트코인)', symbol: 'BTC', value: 8500, type: 'in' },
    { name: 'ETH(이더리움)', symbol: 'ETH', value: 3200, type: 'in' },
    { name: '스테이블코인', symbol: 'STABLE', value: 12500, type: 'in' },
    { name: '밈코인', symbol: 'MEME', value: -4500, type: 'out' },
    { name: '상위 알트코인', symbol: 'ALTS', value: 2100, type: 'in' },
    { name: '거래소 유출입', symbol: 'EXCHANGE', value: -840, type: 'out' },
  ]
};

const INSIGHTS: Record<string, string> = {
  ASSET: "금리 동결 전망에 따라 채권에서 탈출한 자금이 기술주와 크립토로 가파르게 유입되는 '위험자산 선호' 장세입니다.",
  REGION: "중국 증시의 불확실성이 지속되면서 이탈한 자본이 미국 빅테크와 일본 반도체 섹터로 집중 이동하고 있습니다.",
  CRYPTO: "스테이블코인 공급량이 역대 최고치에 근접하며, 이는 비트코인 추가 상승을 위한 대기 매수 자금으로 해석됩니다.",
  SECTOR: "AI 연산 수요 폭증으로 인해 반도체 섹터 주도의 독주 체제가 이어지고 있으며, 타 섹터의 자금을 흡수하는 Black Hole 현상이 관찰됩니다.",
};

const formatVal = (val: number) => {
  const abs = Math.abs(val);
  if (abs >= 1000) return `${val > 0 ? '+' : ''}${(val / 1000).toFixed(1)}B`;
  return `${val > 0 ? '+' : ''}${val}M`;
};

const MoneyFlowSummary = memo(() => {
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ASSET');
  const [viewMode, setViewMode] = useState<'list' | 'heatmap'>('heatmap');

  useEffect(() => {
    setMounted(true);
  }, []);

  // 모달 열림 시 배경 스크롤 방지 (Scroll Lock)
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  const currentFlows = useMemo(() => FLOW_DATA[activeTab] || [], [activeTab]);
  const currentInsight = useMemo(() => INSIGHTS[activeTab] || INSIGHTS.ASSET, [activeTab]);

  const handleFlowClick = (item: any) => {
    const event = new CustomEvent('change-market-symbol', { 
      detail: { symbol: item.symbol, category: activeTab } 
    });
    window.dispatchEvent(event);
    setIsModalOpen(false);
  };

  return (
    <div className={styles.wrap} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      
      {/* Badge View */}
      <button className={styles.badge} onClick={() => setIsModalOpen(true)}>
        <Flame size={12} className={styles.flameIcon} /> 
        <span>자본 흐름도</span>
        <div className={styles.pulseDot} />
      </button>

      {/* Hover Mini Popover */}
      <AnimatePresence>
        {isHovered && !isModalOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={styles.hoverPopover}
          >
            <div className={styles.previewHeader}>
              <span>핵심 자본 이동</span>
              <div className={styles.liveTagWrap}><span className={styles.liveDot} /> LIVE</div>
            </div>
            <div className={styles.miniList}>
              {FLOW_DATA.ASSET.slice(0, 4).map((item, i) => (
                <div key={i} className={styles.gridRow}>
                  <div className={styles.colLabel}>{item.name}</div>
                  <div className={styles.colTrack}>
                    <div className={styles.trackCenter} />
                    <div 
                      className={styles.trackFill} 
                      style={{ 
                        backgroundColor: item.type === 'in' ? '#10b981' : '#f43f5e',
                        width: `${Math.min((Math.abs(item.value) / 15000) * 100, 100)}%`,
                        left: item.type === 'in' ? '50%' : 'auto',
                        right: item.type === 'in' ? 'auto' : '50%'
                      }} 
                    />
                  </div>
                  <div className={styles.colValue} style={{ color: item.type === 'in' ? '#10b981' : '#f43f5e' }}>{formatVal(item.value)}</div>
                </div>
              ))}
            </div>
            <div className={styles.previewHint}>탭 전환 및 시각화 분석 클릭 ↗</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Details Modal (Terminal Style) */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div className={styles.modalBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)}>
            <motion.div 
              className={styles.modalContent} 
              initial={{ opacity: 0, scale: 0.98, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <div className={styles.titleArea}>
                  <div className={styles.modalTitle}>
                    <Zap size={20} color="#f59e0b" fill="#f59e0b" />
                    <h2>Capital Flow Intelligence</h2>
                  </div>
                  <p className={styles.modalDesc}>다차원 글로벌 자본 흐름도 & 리스크 센티멘트 분석</p>
                </div>
                <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}><X size={24} /></button>
              </div>

              <div className={styles.modalBody}>
                {/* Sidebar Navigation */}
                <div className={styles.sidebar}>
                  <div className={styles.sidebarSection}>
                    <span className={styles.sideLabel}>CATEGORIES</span>
                    {CATEGORIES.map(cat => (
                      <button 
                        key={cat.id} 
                        className={activeTab === cat.id ? styles.sideItemActive : styles.sideItem}
                        onClick={() => setActiveTab(cat.id)}
                      >
                        {cat.icon}
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                  
                  <div className={styles.sidebarFooter}>
                    <div className={styles.riskGauge}>
                      <span className={styles.gaugeLabel}>Global Sentiment</span>
                      <div className={styles.gaugeTrack}><div className={styles.gaugeFill} style={{ width: '78%' }} /></div>
                      <span className={styles.gaugeStatus}>EXTREME GREED (78)</span>
                    </div>
                  </div>
                </div>

                {/* Main Data Panel */}
                <div className={styles.mainContent}>
                  <div className={styles.contentHeader}>
                    <div className={styles.activeCategoryInfo}>
                      <h3 className={styles.catTitle}>{CATEGORIES.find(c => c.id === activeTab)?.label} 인플럭스</h3>
                    </div>
                    <div className={styles.viewControls}>
                       <button className={`${styles.viewBtn} ${viewMode === 'heatmap' ? styles.viewBtnActive : ''}`} onClick={() => setViewMode('heatmap')}>히트맵</button>
                       <button className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`} onClick={() => setViewMode('list')}>리스트</button>
                    </div>
                  </div>

                  {/* AI Insight Card */}
                  <div className={styles.aiInsightBox}>
                    <div className={styles.aiHeader}>
                      <Sparkles size={16} color="#8b5cf6" />
                      <span>AI Market Reasoning</span>
                    </div>
                    <p className={styles.aiContent}>{currentInsight}</p>
                  </div>

                  {viewMode === 'list' ? (
                    <div className={styles.flowGrid}>
                      <div className={styles.gridHeader}>
                        <span>ASSET / SYMBOL</span>
                        <span style={{ textAlign: 'center' }}>FLOW (OUT / IN)</span>
                        <span style={{ textAlign: 'right' }}>VOLUME (NET)</span>
                      </div>
                      <div className={styles.flowList}>
                        {currentFlows.map((item, i) => {
                          const isOut = item.type === 'out';
                          const ratio = Math.min((Math.abs(item.value) / 20000) * 100, 100);
                          return (
                            <div key={i} className={styles.flowRow} onClick={() => handleFlowClick(item)}>
                              <div className={styles.flowInfo}>
                                <span className={styles.itemName}>{item.name}</span>
                                <span className={styles.itemSym}>{item.symbol}</span>
                              </div>
                              <div className={styles.flowTrackCol}><div className={styles.flowTrack}><div className={styles.flowTrackCenter} /><div className={styles.flowFill} style={{ backgroundColor: isOut ? '#f43f5e' : '#10b981', left: isOut ? 'auto' : '50%', right: isOut ? '50%' : 'auto', width: `${ratio}%` }} /></div></div>
                              <div className={styles.flowNet} style={{ color: isOut ? '#f43f5e' : '#10b981' }}>{formatVal(item.value)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Heatmap Treemap View */
                    <div className={styles.heatmapContainer}>
                      <div className={styles.heatmapGrid}>
                        {currentFlows.map((item, i) => {
                          const isOut = item.type === 'out';
                          const absVal = Math.abs(item.value);
                          // 면적을 값의 제곱근에 비례하게 설정 (Treemap 느낌)
                          const sizeRatio = Math.sqrt(absVal / 20000); 
                          const bgIntensity = Math.min(0.1 + (absVal / 25000), 0.8);
                          
                          return (
                            <motion.div 
                              key={i}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.05 }}
                              className={styles.heatItem}
                              onClick={() => handleFlowClick(item)}
                              style={{ 
                                backgroundColor: isOut ? `rgba(244, 63, 94, ${bgIntensity})` : `rgba(16, 185, 129, ${bgIntensity})`,
                                border: `1px solid ${isOut ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.3)'}`,
                                flex: `1 1 ${sizeRatio * 180}px`,
                                minHeight: `${80 + sizeRatio * 60}px`
                              }}
                            >
                              <div className={styles.heatLabel}>{item.name}</div>
                              <div className={styles.heatValue}>{formatVal(item.value)}</div>
                              <div className={styles.heatSymbol}>{item.symbol}</div>
                            </motion.div>
                          );
                        })}
                      </div>
                      <div className={styles.heatLegend}>
                        <span>OUTFLOW (높음)</span>
                        <div className={styles.legendBar} />
                        <span>INFLOW (높음)</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.modalFooter}>
                <div className={styles.footerInfo}><Clock size={12} /><span>Real-time aggregation. Refresh interval: 60s.</span></div>
                <div className={styles.footerHint}><Info size={12} />항목 클릭 시 메인 차트 동기화 지원.</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

MoneyFlowSummary.displayName = 'MoneyFlowSummary';
export default MoneyFlowSummary;
