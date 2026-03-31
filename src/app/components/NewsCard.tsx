import { useState, useEffect, memo, useCallback } from 'react';
import Image from 'next/image';
import styles from './NewsCard.module.css';
import { ExternalLink, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface NewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  source: string;
  thumbnail?: string;
}

const POSITIVE_WORDS = ["상승", "호재", "돌파", "혁신", "성장", "급등", "bullish", "gain", "breakthrough", "win", "success", "반등", "최고", "회복"];
const NEGATIVE_WORDS = ["하락", "폭락", "우려", "위기", "급락", "제재", "bearish", "crash", "warning", "fall", "drop", "loss", "위협", "붕괴"];

const getSentiment = (title: string, snippet: string) => {
  const text = (title + snippet).toLowerCase();
  if (POSITIVE_WORDS.some(w => text.includes(w))) return { label: 'BULLISH', color: '#22c55e', icon: TrendingUp };
  if (NEGATIVE_WORDS.some(w => text.includes(w))) return { label: 'BEARISH', color: '#ef4444', icon: TrendingDown };
  return { label: 'NEUTRAL', color: '#94a3b8', icon: Minus };
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

  const sentiment = getSentiment(item.title, item.contentSnippet);
  const SentimentIcon = sentiment.icon;
  const showImage = isValidImageUrl(item.thumbnail) && !imgError;
  const cleanSnippet = item.contentSnippet?.replace(/<[^>]*>?/gm, '') || '';

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

  // ── 리스트 뷰 ────────────────────────────────────────────────
  if (isListMode) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 8 }}
        whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
        transition={{ duration: 0.15 }}
        className={`${styles.cardList} glass-card`}
        onClick={() => onClick(item)}
      >
        {/* 썸네일 (좌측) */}
        {showImage && (
          <div className={styles.thumbnailContainerList}>
            <Image
              src={item.thumbnail!}
              alt={item.title}
              fill
              sizes="120px"
              className={styles.thumbnail}
              loading="lazy"
              onError={handleImgError}
              style={{ objectFit: 'cover' }}
              unoptimized={false}
            />
            <div className={styles.thumbnailOverlay} />
          </div>
        )}

        {/* 텍스트 (우측) */}
        <div className={styles.contentList}>
          {/* 메타 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
            <span className={styles.source} style={{ fontSize: '0.55rem' }}>{item.source}</span>
            <span
              style={{
                fontSize: '0.55rem', color: sentiment.color, fontWeight: 800,
                background: `${sentiment.color}15`, padding: '0.1rem 0.3rem',
                borderRadius: '3px', border: `1px solid ${sentiment.color}30`,
              }}
            >
              {sentiment.label}
            </span>
            {timeAgo && (
              <span className={styles.time} style={{ fontSize: '0.58rem', marginLeft: 'auto' }} suppressHydrationWarning>
                <Clock size={10} />{timeAgo}
              </span>
            )}
          </div>

          {/* 제목 */}
          <p className={styles.titleList}>{item.title}</p>

          {/* 스니펫 */}
          {cleanSnippet && (
            <p className={styles.snippetList}>
              {cleanSnippet.length > 80 ? cleanSnippet.slice(0, 80) + '…' : cleanSnippet}
            </p>
          )}

          {/* 푸터 */}
          <div className={styles.footerList}>
            <div className={styles.readMore} style={{ fontSize: '0.65rem' }}>
              <span>상세 보기</span>
              <ExternalLink size={12} className={styles.linkIcon} />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── 카드 뷰 (기본) ───────────────────────────────────────────
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
      transition={{ duration: 0.2 }}
      className={`${styles.card} glass-card`}
      onClick={() => onClick(item)}
      style={{ cursor: 'pointer' }}
    >
      <div className={styles.glow} />

      {showImage ? (
        <div className={styles.thumbnailContainer}>
          <Image
            src={item.thumbnail!}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 100vw, 380px"
            className={styles.thumbnail}
            loading="lazy"
            onError={handleImgError}
            style={{ objectFit: 'cover' }}
            unoptimized={false}
          />
          <div className={styles.thumbnailOverlay} />
          <div
            className={styles.sentimentBadge}
            style={{ color: sentiment.color, borderColor: `${sentiment.color}33`, background: `${sentiment.color}11` }}
          >
            <SentimentIcon size={14} />
            <span>{sentiment.label}</span>
          </div>
        </div>
      ) : (
        <div className={styles.noThumbnailPadding}>
          <div
            className={styles.inlineBadge}
            style={{ color: sentiment.color, borderColor: `${sentiment.color}33`, background: `${sentiment.color}11` }}
          >
            <SentimentIcon size={12} />
            <span>{sentiment.label}</span>
          </div>
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.metaLeft}>
            <span className={styles.source}>{item.source}</span>
          </div>
          {timeAgo && (
            <span className={styles.time} suppressHydrationWarning>
              <Clock size={12} />
              {timeAgo}
            </span>
          )}
        </div>
        <h3 className={styles.title}>{item.title}</h3>
        <p className={styles.snippet}>
          {cleanSnippet.length > 90 ? cleanSnippet.slice(0, 90) + '…' : cleanSnippet}
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
});

NewsCard.displayName = 'NewsCard';
export default NewsCard;
