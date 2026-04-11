'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import Image from 'next/image';
import styles from './NewsCard.module.css';
import { 
  ExternalLink, Clock, TrendingUp, TrendingDown, 
  Minus, Info, Zap, History 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion } from 'framer-motion';

import { SentimentData, NewsItem } from '@/types';

const POSITIVE_WORDS = ["상승", "호재", "돌파", "혁신", "성장", "급등", "반등", "최고", "회복", "강세", "bullish", "gain"];
const NEGATIVE_WORDS = ["하락", "폭락", "우려", "위기", "급락", "제재", "위협", "붕괴", "약세", "bearish", "crash"];

const getSentiment = (title: string, snippet: string) => {
  const text = (title + snippet).toLowerCase();
  if (POSITIVE_WORDS.some(w => text.includes(w))) return { label: '긍정', color: '#10b981', icon: TrendingUp };
  if (NEGATIVE_WORDS.some(w => text.includes(w))) return { label: '부정', color: '#f43f5e', icon: TrendingDown };
  return { label: '중립', color: '#94a3b8', icon: Minus };
};

const isValidImageUrl = (url?: string): boolean => {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const NewsCard = memo(({ item, onClick, isListMode = false }: {
  item: NewsItem;
  onClick: (item: NewsItem) => void;
  isListMode?: boolean;
}) => {
  const [timeAgo, setTimeAgo] = useState('');
  const [imgError, setImgError] = useState(false);

  // AI Metadata
  const sentiment = getSentiment(item.title, item.contentSnippet);
  const SentimentIcon = sentiment.icon;
  const showImage = isValidImageUrl(item.thumbnail || undefined) && !imgError && !isListMode;
  const cleanSnippet = item.contentSnippet?.replace(/<[^>]*>?/gm, '') || '';
  
  const isUrgent = item.importance === 'URGENT';
  const isMajor = item.importance === 'MAJOR';
  const hasClusters = (item.clusterCount || 0) > 0;

  useEffect(() => {
    try {
      if (item.pubDate) {
        setTimeAgo(formatDistanceToNow(new Date(item.pubDate), { addSuffix: true, locale: ko }));
      }
    } catch {
      setTimeAgo(item.pubDate || '');
    }
  }, [item.pubDate]);

  const handleImgError = useCallback(() => setImgError(true), []);

  // ── 리스트 뷰 (초고압축 인텔리전스 모드) ──────────
  if (isListMode) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        className={`${styles.cardList} ${isUrgent ? styles.urgentBorder : ''} glass-card`}
        onClick={() => onClick(item)}
      >
        <div className={styles.metaList}>
          {isUrgent ? (
            <div className={styles.urgentBadge}>
              <Zap size={10} fill="currentColor" /> URGENT
            </div>
          ) : isMajor ? (
            <div className={styles.majorBadge}>MAJOR</div>
          ) : (
            <span className={styles.sourceBadge}>{item.source}</span>
          )}
          <span className={styles.timeText}>{timeAgo}</span>
          {hasClusters && <span className={styles.clusterTag}>+{item.clusterCount} related</span>}
        </div>
        <div className={styles.titleRowList}>
          <h3 className={styles.titleList}>{item.title}</h3>
          <div className={styles.impactScoreMini}>
            <div className={styles.scoreBar} style={{ height: `${item.impactScore}%`, backgroundColor: sentiment.color }} />
          </div>
        </div>
      </motion.div>
    );
  }

  // ── 카드 뷰 (인텔리전스 분석형) ──────────────────
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, borderColor: 'rgba(129, 140, 248, 0.4)' }}
      className={`${styles.card} ${isUrgent ? styles.urgentBorder : ''} glass-card`}
      onClick={() => onClick(item)}
    >
      <div className={styles.influenceBar} style={{ width: `${item.impactScore}%`, background: `linear-gradient(90deg, ${sentiment.color}80, ${sentiment.color})` }} />
      
      {showImage && (
        <div className={styles.imageWrapper}>
          <Image
            src={item.thumbnail!}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className={styles.thumbnail}
            onError={handleImgError}
            priority={false}
          />
          <div className={styles.imageOverlay} />
          <div className={styles.categoryBadge}>{item.category || '인사이트'}</div>
          {isUrgent && <div className={styles.urgentFlash}>BREAKING NEWS</div>}
        </div>
      )}

      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={styles.sourceText}>{item.source}</span>
            <div style={{ width: '2px', height: '2px', borderRadius: '50%', background: 'var(--text-secondary)' }} />
            <span className={styles.timeText}>{timeAgo}</span>
          </div>
          <div 
            className={styles.sentimentChip} 
            style={{ color: sentiment.color, border: `1px solid ${sentiment.color}30`, background: `${sentiment.color}10` }}
          >
            <SentimentIcon size={12} />
            {sentiment.label}
          </div>
        </div>

        <h3 className={styles.cardTitle}>{item.title}</h3>
        
        <p className={styles.cardSnippet}>
          {cleanSnippet.length > 100 ? cleanSnippet.slice(0, 100) + '...' : cleanSnippet}
        </p>

        <div className={styles.cardFooter}>
          <div className={styles.statsGroup}>
             {hasClusters && <span className={styles.clusterInfo}><History size={12} /> {item.clusterCount}개 유사 기사</span>}
             <span className={styles.impactLabel}>영향력 {item.impactScore}%</span>
          </div>
          <span className={styles.readMoreBtn}>
            AI 분석 리포트
            <ArrowRightIcon size={14} style={{ marginLeft: '4px' }} />
          </span>
        </div>
      </div>
    </motion.div>
  );
});

const ArrowRightIcon = ({ size, style }: { size: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

NewsCard.displayName = 'NewsCard';
export default NewsCard;
