'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, ChevronRight, Zap } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import styles from './BreakingNewsBanner.module.css';
import { useState, useEffect } from 'react';

export default function BreakingNewsBanner() {
  const { breakingNews, setBreakingNews } = useUIStore();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (breakingNews && breakingNews.length > 0) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [breakingNews]);

  if (!isVisible || !breakingNews || breakingNews.length === 0) return null;

  const currentNews = breakingNews[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className={styles.bannerContainer}
      >
        <div className={styles.bannerContent}>
          <div className={styles.tag}>
            <Zap size={14} fill="#ff4d4d" color="#ff4d4d" />
            <span>BREAKING</span>
          </div>
          
          <div className={styles.newsTitle}>
            <span className={styles.source}>[{currentNews.source}]</span>
            {currentNews.title}
          </div>

          <div className={styles.actions}>
            <button 
              className={styles.viewBtn}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-news-drawer', { detail: currentNews }));
                setIsVisible(false);
              }}
            >
              인텔리전스 분석 보기 <ChevronRight size={14} />
            </button>
            <button className={styles.closeBtn} onClick={() => setIsVisible(false)}>
              <X size={16} />
            </button>
          </div>
        </div>
        <div className={styles.progressLine} />
      </motion.div>
    </AnimatePresence>
  );
}
