'use client';

import { 
  X, ExternalLink, Clock, TrendingUp, TrendingDown, 
  Minus, Sparkles, AlertCircle, ArrowUpRight, 
  Zap, Brain, ShieldAlert, BarChart3, 
  ChevronRight, MessageSquare, History, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './NewsDrawer.module.css';
import { memo, useState, useEffect, useRef } from 'react';
import { NewsItem } from '@/types';


interface NewsDrawerProps {
  item: NewsItem | null;
  onClose: () => void;
}

const NewsDrawer = memo(({ item, onClose }: NewsDrawerProps) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  if (!item) return null;

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const userMsg = { role: 'user', text: inputValue, ts: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/news/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newsId: item.id,
          message: inputValue,
          context: { title: item.title, assets: (item as any).assets }
        })
      });
      const data = await res.json();
      const aiMsg = { role: 'ai', text: data.answer, ts: data.timestamp, confidence: data.confidence };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: '죄송합니다. 분석 중 오류가 발생했습니다. 다시 시도해 주세요.', isError: true }]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className={styles.backdrop}
      />

      <motion.div
        initial={{ x: '100%', opacity: 0.5 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0.5 }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className={styles.sidebar}
      >
        {/* Intelligence Header */}
        <div className={styles.headerControl}>
          <div className={styles.headerLeft}>
            <div className={styles.statusBadge}>
              <Zap size={10} fill="#f59e0b" color="#f59e0b" />
              MAJOR IMPACT
            </div>
            <div className={styles.categoryTag}>{item.category || '금융/거시'}</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.contentScroll}>
          {/* Main Intelligence Analysis */}
          {!isChatOpen ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              <div className={styles.titleSection}>
                <h2 className={styles.mainTitle}>{item.title}</h2>
                <div className={styles.metaRow}>
                  <span className={styles.sourceText}>{item.source}</span>
                  <div className={styles.metaDivider} />
                  <div className={styles.metaItem}><Clock size={12} /><span>{new Date(item.pubDate).toLocaleString()}</span></div>
                </div>
              </div>

              <section className={styles.intelligenceBox}>
                <div className={styles.aiHeader}>
                  <div className={styles.aiLabel}><Sparkles size={16} className={styles.sparkleIcon} />AI 인텔리전스 분석</div>
                  <div className={styles.aiBadge}>Analysis Complete</div>
                </div>
                <div className={styles.summarySection}>
                  <h4 className={styles.smallHeading}>3줄 핵심 요약</h4>
                  <ul className={styles.summaryList}>
                    <li>현재 시장의 핵심 변동성은 {item.source} 보도와 밀접하게 연동되어 있습니다.</li>
                    <li>AI 분석 결과 단기적으로 자산군 전반에 높은 수준의 상관관계가 포착되었습니다.</li>
                    <li>해당 뉴스는 거시 경제의 펀더멘탈 변화보다는 심리적 변동에 더 큰 영향을 줄 것으로 보입니다.</li>
                  </ul>
                </div>
              </section>

              <section className={styles.impactMatrix}>
                <h4 className={styles.sectionTitle}>시장 예상 영향도 (Asset Intelligence)</h4>
                <div className={styles.impactGrid}>
                  {(item as any).assets && (item as any).assets.length > 0 ? (
                    (item as any).assets.map((asset: string, idx: number) => (
                      <ImpactCard 
                        key={idx} 
                        label={asset} 
                        value={`${(item as any).sentiment === 'POSITIVE' ? '+' : '-'}${(item as any).impactScore / 10}%`} 
                        status={(item as any).sentiment === 'POSITIVE' ? 'up' : (item as any).sentiment === 'NEGATIVE' ? 'down' : 'neutral'} 
                      />
                    ))
                  ) : (
                    <>
                      <ImpactCard label="시장 전반 (S&P500)" value="관망" status="neutral" />
                      <ImpactCard label="변동성 지수 (VIX)" value="추적 중" status="neutral" />
                    </>
                  )}
                </div>
              </section>

              {/* Dynamic Risk Analysis Section */}
              <section className={styles.riskAnalysisBox}>
                 <div className={styles.riskHeaderLine}>
                    <ShieldAlert size={16} color="#f43f5e" />
                    <span>AI 리스크 분석 (Exposure Score)</span>
                    <span className={styles.riskVal}>{(item as any).impactScore || 65}%</span>
                 </div>
                 <div className={styles.riskTrack}>
                    <div className={styles.riskFill} style={{ width: `${(item as any).impactScore || 65}%` }} />
                 </div>
                 <p className={styles.riskBrief}>
                    {(item as any).impactScore > 80 ? '치명적 노출: 즉각적인 리스크 관리가 필요합니다.' : 
                     (item as any).impactScore > 50 ? '주의 요망: 변동성 확대 가능성이 높습니다.' : '안정적: 특이 리스크는 포착되지 않았습니다.'}
                 </p>
              </section>

              <div className={styles.connectivity}>
                <button className={styles.connectBtn} onClick={() => setIsChatOpen(true)}>
                  <MessageSquare size={16} />
                  AI 인텔리전스 채팅 시작
                  <ChevronRight size={14} className={styles.pushRight} />
                </button>
              </div>

              <div className={styles.bodySnippet}>
                 <h4 className={styles.sectionTitle}>뉴스 스니펫</h4>
                 <p className={styles.snippetText}>{item.contentSnippet?.replace(/<[^>]*>?/gm, '')}</p>
              </div>
            </div>
          ) : (
            /* AI Intelligence Chat Layer */
            <div className={styles.chatLayer}>
              <div className={styles.chatHeader}>
                <button className={styles.backBtn} onClick={() => setIsChatOpen(false)}>
                  <ArrowUpRight size={16} style={{ transform: 'rotate(-135deg)' }} />
                  백리포트로 돌아가기
                </button>
                <div className={styles.chatStatus}><div className={styles.livePulse} /> AI 분석 중</div>
              </div>

              <div className={styles.messageArea} ref={chatScrollRef}>
                {messages.length === 0 && (
                  <div className={styles.welcomeInfo}>
                     <Brain size={32} />
                     <p>이 뉴스에 대해 무엇이든 물어보세요.<br/>자산 영향, 과거 사례, 매크로 상관성 등.</p>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div key={idx} className={`${styles.message} ${styles[msg.role]}`}>
                    {msg.role === 'ai' && <div className={styles.aiAvatar}><Sparkles size={10} /></div>}
                    <div className={styles.bubble}>{msg.text}</div>
                  </div>
                ))}
                {isTyping && <div className={styles.typingIndicator}>AI가 데이터를 분석 중입니다...</div>}
              </div>

              <form className={styles.inputArea} onSubmit={handleAskAI}>
                <input 
                  type="text" 
                  placeholder="질문을 입력하세요..." 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isTyping}
                />
                <button type="submit" disabled={isTyping}>질문</button>
              </form>
            </div>
          )}
        </div>

        <div className={styles.drawerFooter}>
          <div className={styles.disclaimer}>* 본 분석은 AI 모델에 의한 결과이며 투자 권유가 아닙니다.</div>
          <div className={styles.actionRow}>
            <a href={item.link} target="_blank" rel="noopener noreferrer" className={styles.fullArticleBtn}>
              소스 원문 보기
              <ArrowUpRight size={18} />
            </a>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

function ImpactCard({ label, value, status }: { label: string, value: string, status: 'up' | 'down' | 'neutral' }) {
  const Icon = status === 'up' ? TrendingUp : status === 'down' ? TrendingDown : Minus;
  const colorClass = styles[status];
  
  const handleClick = () => {
    // 뉴스 인사이트에서 자산 클릭 시 글로벌 차트 심볼 변경 이벤트 발생
    const symbolMap: Record<string, string> = {
      '나스닥 선물': 'NASDAQ100',
      '비트코인': 'BTCUSDT',
      '원/달러 환율': 'FX_IDC:USDKRW',
      '미 국채 10년': 'TVC:US10Y'
    };
    
    const targetSymbol = symbolMap[label];
    if (targetSymbol) {
      window.dispatchEvent(new CustomEvent('change-market-symbol', { 
        detail: { symbol: targetSymbol, category: label.includes('나스닥') ? 'stock' : 'crypto' } 
      }));
    }
  };
  
  return (
    <div className={`${styles.impactCard} ${colorClass}`} onClick={handleClick} style={{ cursor: 'pointer' }}>
      <span className={styles.impactLabel}>{label}</span>
      <div className={styles.impactValRow}>
        <Icon size={14} />
        <span className={styles.impactValue}>{value}</span>
      </div>
      <div className={styles.impactStatus}>{status.toUpperCase()}</div>
      <div className={styles.clickHint}>CHART VIEW</div>
    </div>
  );
}

NewsDrawer.displayName = 'NewsDrawer';
export default NewsDrawer;
