'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import styles from './page.module.css';
import FilterBar from './components/FilterBar';
import NewsCard from './components/NewsCard';
import NewsSkeleton from './components/NewsSkeleton';
import SentimentWidget from './components/SentimentWidget';
import MarketWidget from './components/MarketWidget';
import MacroWidget from './components/MacroWidget';
import CryptoVolumeWidget from './components/CryptoVolumeWidget';
import TradeWidget from './components/TradeWidget';
import WhaleTradesWidget from './components/WhaleTradesWidget';
import { Sun, Moon } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  source: string;
  thumbnail?: string;
}

const ZONES = [
  { label: '서울 🇰🇷', zone: 'Asia/Seoul', offset: 9 },
  { label: '뉴욕 🇺🇸', zone: 'America/New_York', offset: -5 },
  { label: '런던 🇬🇧', zone: 'Europe/London', offset: 0 },
  { label: '파리 🇫🇷', zone: 'Europe/Paris', offset: 1 },
  { label: '모스크바 🇷🇺', zone: 'Europe/Moscow', offset: 3 },
  { label: '이스라엘 🇮🇱', zone: 'Asia/Jerusalem', offset: 2 },
  { label: '이란 🇮🇷', zone: 'Asia/Tehran', offset: 3.5 },
  { label: '두바이 🇦🇪', zone: 'Asia/Dubai', offset: 4 },
  { label: '베이징 🇨🇳', zone: 'Asia/Shanghai', offset: 8 },
].sort((a, b) => a.offset - b.offset);

const GlobalClockTicker = memo(() => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getZoneData = (zone: string) => {
    const timeStr = currentTime.toLocaleTimeString('ko-KR', {
      timeZone: zone,
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const dateStr = new Intl.DateTimeFormat('ko-KR', {
      timeZone: zone,
      month: 'numeric',
      day: 'numeric',
      weekday: 'short'
    }).format(currentTime);

    const hour = parseInt(new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hour: 'numeric',
      hour12: false
    }).format(currentTime));

    return { date: dateStr, timeStr, isDay: hour >= 6 && hour < 18 };
  };

  if (!mounted) return <div className={styles.clockTicker} style={{ height: '40px' }} />;

  return (
    <div className={styles.clockTicker}>
      {ZONES.map(z => {
        const { date, timeStr, isDay } = getZoneData(z.zone);
        return (
          <div key={z.zone} className={`${styles.clockItem} ${isDay ? styles.isDay : styles.isNight}`}>
            <div className={styles.itemHeader}>
              <span className={styles.clockLabel}>{z.label}</span>
              {isDay ? <Sun size={10} className={styles.sunIcon} /> : <Moon size={10} className={styles.moonIcon} />}
            </div>
            <span className={styles.clockTime}>{timeStr}</span>
            <span className={styles.clockDate}>{date}</span>
          </div>
        );
      })}
    </div>
  );
});

GlobalClockTicker.displayName = 'GlobalClockTicker';

export default function Dashboard() {
  const [theme, setTheme] = useState('light');
  const [country, setCountry] = useState('KR');
  const [topic, setTopic] = useState('ALL');
  const [page, setPage] = useState(1);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchNews = useCallback(async (c: string, t: string, p: number, background = false) => {
    if (!background) setLoading(true);
    setIsRefreshing(true);
    setError('');

    try {
      const res = await fetch(`/api/news?category=${c}&topic=${t}&page=${p}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      setNews(data.items || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError('뉴스를 불러오는 데 실패했습니다.');
    } finally {
      if (!background) setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNews(country, topic, page);
    const interval = setInterval(() => {
      fetchNews(country, topic, page, true);
    }, 30000); // 30 second real-time polling
    return () => clearInterval(interval);
  }, [country, topic, page, fetchNews]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handlePageChange = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className={styles.dashboard} data-theme={theme}>
      <header className={styles.header}>
        {/* Top row: Title + Theme Toggle */}
        <div className={styles.headerTopRow}>
          <div className={styles.headerLeft}>
            <div className={styles.liveBadge}>
              <span className={styles.pulse} />
              LIVE GLOBAL TERMINAL
            </div>
            <h1 className={styles.title}>Global <span className="gradient-text">Terminal</span></h1>
            <p className={styles.subtitle}>실시간 금융 뉴스 및 거시경제 데이터 익스체인지</p>
          </div>

          <button
            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            className={styles.themeToggleBtn}
            aria-label="Toggle theme"
          >
            <div className={styles.themeBtnIcon}>
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </div>
            <span className={styles.themeBtnLabel}>
              {theme === 'light' ? '다크 모드' : '라이트 모드'}
            </span>
          </button>
        </div>

        {/* Bottom row: Real-time World Clock Ticker */}
        <div className={styles.clockRow}>
          <div className={styles.clockRowLabel}>
            <span className={styles.pulse} style={{ background: '#22c55e' }} />
            WORLD TIME
          </div>
          <GlobalClockTicker />
        </div>
      </header>

      <div className={styles.gridContainer}>
        <div className={styles.newsSection}>
          <FilterBar
            country={country}
            setCountry={(c) => { setCountry(c); setPage(1); }}
            topic={topic}
            setTopic={(t) => { setTopic(t); setPage(1); }}
            onRefresh={() => fetchNews(country, topic, page)}
            isRefreshing={isRefreshing}
          />

          {error && <div className={styles.errorBanner}>{error}</div>}

          {loading && !isRefreshing ? (
            <div className={styles.newsGrid}>
              {[...Array(6)].map((_, i) => <NewsSkeleton key={`skeleton-${i}`} />)}
            </div>
          ) : (
            <>
              <div className={styles.newsGrid}>
                {news.map((item) => (
                  <NewsCard key={item.id} item={item} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className={styles.pagination}>
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => handlePageChange(i + 1)}
                      className={`${styles.pageBtn} ${page === i + 1 ? styles.activePage : ''}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  {totalPages > 5 && <span className={styles.pageDots}>...</span>}
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.widgetSection}>
          <SentimentWidget />
          <CryptoVolumeWidget />
          <WhaleTradesWidget />
          <MacroWidget />
          <TradeWidget />
          <MarketWidget />
        </div>
      </div>
    </main>
  );
}
