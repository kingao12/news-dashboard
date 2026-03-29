import styles from './FilterBar.module.css';
import { RefreshCw, Globe, MapPin, Flag, Compass, Navigation, Coins, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

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
            <button 
              onClick={() => { setIsCountryOpen(!isCountryOpen); setIsTopicOpen(false); }} 
              className={`${styles.dropdownSwitch} ${isCountryOpen ? styles.dropdownSwitchActive : ''}`}
            >
              <CountryIcon size={16} className={styles.dropdownIcon} />
              <span>{selectedCountry.label}</span>
              <ChevronDown size={16} className={`${styles.chevron} ${isCountryOpen ? styles.chevronOpen : ''}`} />
            </button>
            {isCountryOpen && (
              <div className={styles.dropdownMenu}>
                {COUNTRIES.map(c => {
                  const Icon = c.icon;
                  return (
                    <button 
                      key={c.id} 
                      onClick={() => { setCountry(c.id); setIsCountryOpen(false); }}
                      className={`${styles.dropdownItem} ${country === c.id ? styles.activeDropdownItem : ''}`}
                    >
                      <Icon size={14} /> {c.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 토픽 선택 드롭다운 */}
          <div className={styles.dropdownWrapper} ref={topicRef}>
            <button 
              onClick={() => { setIsTopicOpen(!isTopicOpen); setIsCountryOpen(false); }} 
              className={`${styles.dropdownSwitch} ${isTopicOpen ? styles.dropdownSwitchActive : ''}`}
            >
              <span>{selectedTopic.label}</span>
              <ChevronDown size={16} className={`${styles.chevron} ${isTopicOpen ? styles.chevronOpen : ''}`} />
            </button>
            {isTopicOpen && (
              <div className={styles.dropdownMenu}>
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
            )}
          </div>
        </div>
        
        <button onClick={onRefresh} disabled={isRefreshing} className={styles.refreshBtn}>
          <RefreshCw size={16} className={isRefreshing ? styles.spin : ''} />
          <span>새로고침</span>
        </button>
      </div>
    </div>
  );
}
