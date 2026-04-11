import styles from './FilterBar.module.css';
import { RefreshCw, LayoutGrid, List } from 'lucide-react';
import { motion } from 'framer-motion';

export const CHIP_CATEGORIES = [
  { id: 'ALL', label: '전체', country: 'GLOBAL_ALL', topic: 'ALL' },
  { id: 'URGENT', label: '🚨 핵심속보', country: 'GLOBAL_ALL', topic: 'ALL' }, 
  { id: 'KR_STOCK', label: '🇰🇷 국내증시', country: 'KR', topic: 'BUSINESS' },
  { id: 'US_STOCK', label: '🇺🇸 해외증시', country: 'US', topic: 'BUSINESS' },
  { id: 'CRYPTO', label: '₿ 암호화폐', country: 'CRYPTO', topic: 'ALL' },
  { id: 'MACRO', label: '🏦 거시/금리', country: 'GLOBAL_ALL', topic: 'BUSINESS' },
  { id: 'POLITICS', label: '🗳️ 정치/국제', country: 'GLOBAL_ALL', topic: 'POLITICS' }
];

interface FilterBarProps {
  country: string;
  setCountry: (c: string) => void;
  topic: string;
  setTopic: (t: string) => void;
  activeCategoryId: string;
  setActiveCategory: (id: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  viewMode: 'card' | 'list';
  setViewMode: (mode: 'card' | 'list') => void;
}

export default function FilterBar({ 
  setCountry, setTopic, 
  activeCategoryId, setActiveCategory, 
  onRefresh, isRefreshing, viewMode, setViewMode 
}: FilterBarProps) {
  
  const handleChipClick = (cat: typeof CHIP_CATEGORIES[0]) => {
    setActiveCategory(cat.id);
    setCountry(cat.country);
    setTopic(cat.topic);
  };

  return (
    <div className={styles.filterContainer}>
      <div className={styles.topRow}>
        
        {/* Toggle Chips Section */}
        <div className={styles.chipGroup}>
          {CHIP_CATEGORIES.map(cat => {
            const isActive = activeCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleChipClick(cat)}
                className={`${styles.filterChip} ${isActive ? styles.filterChipActive : ''}`}
              >
                {isActive && (
                  <motion.div layoutId="activeChipBg" className={styles.activeChipBg} initial={false} />
                )}
                <span style={{ position: 'relative', zIndex: 1, whiteSpace: 'nowrap' }}>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.flexSpacer} />

        {/* View Mode Toggle */}
        <div className={styles.viewToggle}>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setViewMode('card')}
            className={`${styles.viewToggleBtn} ${viewMode === 'card' ? styles.viewToggleActive : ''}`}
            title="카드 형식"
          >
            <LayoutGrid size={15} />
            <span className={styles.desktopOnly}>카드</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setViewMode('list')}
            className={`${styles.viewToggleBtn} ${viewMode === 'list' ? styles.viewToggleActive : ''}`}
            title="리스트 형식"
          >
            <List size={15} />
            <span className={styles.desktopOnly}>리스트</span>
          </motion.button>
        </div>

        <div className={styles.separator} />

        {/* Refresh Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRefresh}
          disabled={isRefreshing}
          className={styles.refreshBtn}
        >
          <RefreshCw size={16} className={isRefreshing ? styles.spin : ''} />
          <span className={styles.desktopOnly}>새로고침</span>
        </motion.button>
      </div>
    </div>
  );
}
