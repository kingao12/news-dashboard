import styles from './FilterBar.module.css';
import { RefreshCw, Globe, MapPin, Flag, Compass, Navigation, Coins, ChevronDown, Search, Filter } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const COUNTRIES = [
  { id: 'GLOBAL_ALL', label: '🌐 전체', icon: Globe },
  { id: 'KR', label: '🇰🇷 국내', icon: MapPin },
  { id: 'US', label: '🇺🇸 미국', icon: Flag },
  { id: 'EU', label: '🇪🇺 유럽', icon: Globe },
  { id: 'RU', label: '🇷🇺 러시아', icon: Flag },
  { id: 'CN', label: '🇨🇳 중국', icon: Compass },
  { id: 'JP', label: '🇯🇵 일본', icon: Navigation },
  { id: 'TW', label: '🇹🇼 대만', icon: Navigation },
  { id: 'FR', label: '🇫🇷 프랑스', icon: Flag },
  { id: 'IL', label: '🇮🇱 이스라엘', icon: Flag },
  { id: 'IR', label: '🇮🇷 이란', icon: Flag },
  { id: 'WAR', label: '⚔️ 전쟁/분쟁', icon: Flag },
  { id: 'WORLD', label: '🌍 세계', icon: Globe },
  { id: 'CRYPTO', label: '₿ 코인', icon: Coins },
];

export const TOPICS = [
  { id: 'ALL', label: '⚡ 최신' },
  { id: 'POLITICS', label: '🗳️ 정치' },
  { id: 'BUSINESS', label: '💹 경제' },
  { id: 'TECHNOLOGY', label: '💻 IT/기술' },
  { id: 'AI', label: '🤖 AI' },
  { id: 'SCIENCE', label: '🔬 과학' },
  { id: 'WORLD', label: '🌐 외교/지정학' },
  { id: 'ENTERTAINMENT', label: '🎬 연예/문화' },
  { id: 'HEALTH', label: '🏥 건강/의료' },
];

interface FilterBarProps {
  country: string;
  setCountry: (c: string) => void;
  topic: string;
  setTopic: (t: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function FilterBar({ country, setCountry, topic, setTopic, onRefresh, isRefreshing }: FilterBarProps) {
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [isTopicOpen, setIsTopicOpen] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);
  const topicRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) setIsCountryOpen(false);
      if (topicRef.current && !topicRef.current.contains(e.target as Node)) setIsTopicOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCountry = COUNTRIES.find(c => c.id === country) || COUNTRIES[0];
  const CountryIcon = selectedCountry.icon;
  const selectedTopic = TOPICS.find(t => t.id === topic) || TOPICS[0];

  return (
    <div className={styles.filterContainer}>
      <div className={styles.topRow}>
        <div className={styles.dropdownGroup}>
          {/* 국가 선택 드롭다운 */}
          <div className={styles.dropdownWrapper} ref={countryRef}>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setIsCountryOpen(!isCountryOpen); setIsTopicOpen(false); }} 
              className={`${styles.dropdownSwitch} ${isCountryOpen ? styles.dropdownSwitchActive : ''}`}
            >
              <CountryIcon size={16} className={styles.dropdownIcon} />
              <span style={{ fontWeight: 700 }}>{selectedCountry.label}</span>
              <ChevronDown size={14} className={`${styles.chevron} ${isCountryOpen ? styles.chevronOpen : ''}`} />
            </motion.button>
            <AnimatePresence>
              {isCountryOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={styles.dropdownMenu}
                >
                  <div className={styles.menuLabel}><Globe size={12} /> 국가/지역 필터</div>
                  <div className={styles.menuGrid}>
                    {COUNTRIES.map(c => {
                      const Icon = c.icon;
                      return (
                        <button 
                          key={c.id} 
                          onClick={() => { setCountry(c.id); setIsCountryOpen(false); }}
                          className={`${styles.dropdownItem} ${country === c.id ? styles.activeDropdownItem : ''}`}
                        >
                          <Icon size={13} /> <span>{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className={styles.separator} />

          {/* 토픽 선택 드롭다운 */}
          <div className={styles.dropdownWrapper} ref={topicRef}>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setIsTopicOpen(!isTopicOpen); setIsCountryOpen(false); }} 
              className={`${styles.dropdownSwitch} ${isTopicOpen ? styles.dropdownSwitchActive : ''}`}
            >
              <Filter size={16} className={styles.dropdownIcon} />
              <span style={{ fontWeight: 700 }}>{selectedTopic.label}</span>
              <ChevronDown size={14} className={`${styles.chevron} ${isTopicOpen ? styles.chevronOpen : ''}`} />
            </motion.button>
            <AnimatePresence>
              {isTopicOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={styles.dropdownMenu}
                >
                  <div className={styles.menuLabel}><Search size={12} /> 뉴스 카테고리</div>
                  <div className={styles.menuList}>
                    {TOPICS.map(t => (
                      <button 
                        key={t.id} 
                        onClick={() => { setTopic(t.id); setIsTopicOpen(false); }}
                        className={`${styles.dropdownItem} ${topic === t.id ? styles.activeDropdownItem : ''}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        <div style={{ flex: 1 }} />

        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRefresh} 
          disabled={isRefreshing} 
          className={styles.refreshBtn}
        >
          <RefreshCw size={16} className={isRefreshing ? styles.spin : ''} />
          <span>SYNC</span>
        </motion.button>
      </div>
    </div>
  );
}
