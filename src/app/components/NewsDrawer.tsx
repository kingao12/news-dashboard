'use client';

import { X, ExternalLink, Calendar, Globe, Share2, Bookmark } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './NewsDrawer.module.css';

interface NewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  source: string;
  thumbnail?: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
}

interface NewsDrawerProps {
  item: NewsItem | null;
  onClose: () => void;
}

export default function NewsDrawer({ item, onClose }: NewsDrawerProps) {
  if (!item) return null;

  return (
    <AnimatePresence>
      {item && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={styles.backdrop}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={styles.drawer}
          >
            <div className={styles.drawerHeader}>
              <div className={styles.headerTop}>
                <span className={styles.label}>상세 읽기</span>
                <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">
                  <X size={20} />
                </button>
              </div>
              <h2 className={styles.title}>{item.title}</h2>
              <div className={styles.meta}>
                <span className={styles.source}>{item.source}</span>
                <span className={styles.date}>{new Date(item.pubDate).toLocaleString('ko-KR')}</span>
              </div>
            </div>

            <div className={styles.drawerContent}>
              
              <div className={styles.metaRow}>
                {item.sentiment && (
                  <div className={`${styles.sentimentBadge} ${styles[item.sentiment]}`}>
                    {item.sentiment === 'bullish' ? '상승세' : item.sentiment === 'bearish' ? '하락세' : '중립'}
                  </div>
                )}
              </div>

              {item.thumbnail && (
                <div className={styles.imageWrapper}>
                  <img src={item.thumbnail} alt={item.title} className={styles.thumbnail} />
                </div>
              )}

              <div className={styles.snippetSection}>
                <div className={styles.sectionLabel}>AI 요약 및 스니펫</div>
                <p className={styles.snippetText}>{item.contentSnippet}</p>
              </div>

              <div className={styles.analysisSection}>
                <div className={styles.sectionLabel}>시장 영향도 분석</div>
                <div className={styles.analysisBox}>
                  본 기사는 <strong>{item.source}</strong>를 통해 보도되었으며, 
                  시장의 주요 변동성과 관련된 핵심 키워드를 포함하고 있습니다. 
                  세부적인 영향도는 실시간 마켓 위젯의 지표 변화와 함께 모니터링하시기 바랍니다.
                </div>
              </div>
            </div>

            <div className={styles.drawerFooter}>
              <a 
                href={item.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={styles.fullArticleBtn}
              >
                본문 전체 보기 (외부 링크) <ExternalLink size={16} />
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
