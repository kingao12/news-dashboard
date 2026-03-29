import styles from './NewsCard.module.css';
import { ExternalLink, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

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

export default function NewsCard({ item }: { item: NewsItem }) {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    try {
      if (item.pubDate) {
        setTimeAgo(formatDistanceToNow(new Date(item.pubDate), { addSuffix: true, locale: ko }));
      }
    } catch (e) {
      setTimeAgo(item.pubDate);
    }
  }, [item.pubDate]);

  const cleanSnippet = item.contentSnippet?.replace(/<[^>]*>?/gm, '') || '';

  return (
    <a href={item.link} target="_blank" rel="noopener noreferrer" className={styles.card}>
      <div className={styles.glow} />
      {item.thumbnail && (
        <div className={styles.thumbnailContainer}>
          <img src={item.thumbnail} alt="" className={styles.thumbnail} loading="lazy" />
          <div className={styles.thumbnailOverlay} />
        </div>
      )}
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={styles.source}>{item.source}</span>
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
          <span>기사 읽기</span>
          <ExternalLink size={14} className={styles.linkIcon} />
        </div>
      </div>
    </a>
  );
}
