import styles from './NewsCard.module.css';
import { ExternalLink, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion } from 'framer-motion';

import { useState, useEffect } from 'react';

interface NewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  source: string;
  thumbnail?: string;
}

export default function NewsCard({ item, onClick }: { item: NewsItem, onClick: (item: NewsItem) => void }) {
  const [timeAgo, setTimeAgo] = useState('');
  const [sentiment, setSentiment] = useState<{ label: string, color: string, icon: any } | null>(null);

  useEffect(() => {
    try {
      if (item.pubDate) {
        setTimeAgo(formatDistanceToNow(new Date(item.pubDate), { addSuffix: true, locale: ko }));
      }
    } catch (e) {
      setTimeAgo(item.pubDate || '');
    }

    const text = (item.title + item.contentSnippet).toLowerCase();
    const pos = ["상승", "호재", "돌파", "혁신", "성장", "급등", "bullish", "gain", "breakthrough", "win", "success", "반등"];
    const neg = ["하락", "폭락", "우려", "위기", "급락", "제재", "bearish", "crash", "warning", "fall", "drop", "loss"];
    
    if (pos.some(word => text.includes(word))) {
      setSentiment({ label: "BULLISH", color: "#22c55e", icon: TrendingUp });
    } else if (neg.some(word => text.includes(word))) {
      setSentiment({ label: "BEARISH", color: "#ef4444", icon: TrendingDown });
    } else {
      setSentiment({ label: "NEUTRAL", color: "#94a3b8", icon: Minus });
    }
  }, [item.pubDate, item.title, item.contentSnippet]);

  const cleanSnippet = item.contentSnippet?.replace(/<[^>]*>?/gm, '') || '';
  const SentimentIcon = sentiment?.icon;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
      className={`${styles.card} glass-card`}
      onClick={() => onClick(item)}
      style={{ cursor: 'pointer' }}
    >
      <div className={styles.glow} />
      
      {item.thumbnail ? (
        <div className={styles.thumbnailContainer}>
          <img src={item.thumbnail} alt="" className={styles.thumbnail} loading="lazy" />
          <div className={styles.thumbnailOverlay} />
          {sentiment && (
            <div className={styles.sentimentBadge} style={{ color: sentiment.color, borderColor: `${sentiment.color}33`, background: `${sentiment.color}11` }}>
              <SentimentIcon size={12} />
              <span>{sentiment.label}</span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '1rem 1.5rem 0 1.5rem' }}>
          {sentiment && (
            <div className={styles.inlineBadge} style={{ color: sentiment.color, borderColor: `${sentiment.color}33`, background: `${sentiment.color}11` }}>
              <SentimentIcon size={10} />
              <span>{sentiment.label}</span>
            </div>
          )}
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.metaLeft}>
            <span className={styles.source}>{item.source}</span>
          </div>
          {timeAgo && (
            <span className={styles.time}>
              <Clock size={12} />
              {timeAgo}
            </span>
          )}
        </div>
        <h3 className={styles.title}>{item.title}</h3>
        <p className={styles.snippet}>
          {cleanSnippet.length > 80 ? cleanSnippet.slice(0, 80) + '...' : cleanSnippet}
        </p>
        <div className={styles.footer}>
          <div className={styles.readMore}>
            <span>상세 보기</span>
            <ExternalLink size={14} className={styles.linkIcon} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
