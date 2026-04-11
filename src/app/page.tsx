'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import styles from './page.module.css';
import FilterBar from './components/FilterBar';
import NewsCard from './components/NewsCard';
import NewsSkeleton from './components/NewsSkeleton';
import SentimentWidget from './components/SentimentWidget';
import MarketWidget from './components/MarketWidget';
import MacroWidget from './components/MacroWidget';
import MacroDashBar from './components/MacroDashBar';
import EconomicCalendar from './components/EconomicCalendar';
import WhaleTradesWidget from './components/WhaleTradesWidget';
import CryptoVolumeWidget from './components/CryptoVolumeWidget';
import TradeWidget from './components/TradeWidget';
import NewsDrawer from './components/NewsDrawer';
import MoneyFlowSummary from './components/MoneyFlowSummary';
import AlertManager from './components/AlertManager';
import { Sun, Moon, Zap, TrendingUp, BarChart3, Globe, Clock, Calendar, LayoutGrid, Activity, LineChart, Cpu, Wifi, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  { label: '베이징 🇨🇳', zone: 'Asia/Shanghai', offset: 8 },
  { label: '두바이 🇦🇪', zone: 'Asia/Dubai', offset: 4 },
  { label: '이란 🇮🇷', zone: 'Asia/Tehran', offset: 3.5 },
  { label: '모스크바 🇷🇺', zone: 'Europe/Moscow', offset: 3 },
  { label: '이스라엘 🇮🇱', zone: 'Asia/Jerusalem', offset: 2 },
  { label: '파리 🇫🇷', zone: 'Europe/Paris', offset: 1 },
  { label: '런던 🇬🇧', zone: 'Europe/London', offset: 0 },
  { label: '뉴욕 🇺🇸', zone: 'America/New_York', offset: -5 },
];

const GlobalClockTicker = memo(() => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getZoneData = (zone: string) => {
    // 24시간제 디지털 포맷 (HH:mm:ss)
    const timeStr = currentTime.toLocaleTimeString('en-GB', {
      timeZone: zone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const dateStr = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    }).format(currentTime);

    const hour = parseInt(new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hour: 'numeric',
      hour12: false
    }).format(currentTime));

    // 간단한 장중 상태 로직 (현지 시각 09-16시 기준)
    const isOpen = hour >= 9 && hour < 16;

    return { date: dateStr, timeStr, isOpen, isDay: hour >= 6 && hour < 18 };
  };

  if (!mounted) return <div className={styles.clockGrid} />;

  return (
    <div className={styles.clockGrid}>
      {ZONES.map(z => {
        const { date, timeStr, isOpen, isDay } = getZoneData(z.zone);
        return (
          <div key={z.zone} className={styles.worldClockCard}>
             <div className={styles.clockCardHeader}>
                <span className={styles.cityLabel}>{z.label}</span>
                <div className={`${styles.marketStatus} ${isOpen ? styles.marketOpen : styles.marketClosed}`}>
                   {isOpen ? 'OPEN' : 'CLOSED'}
                </div>
             </div>
             <div className={styles.clockCardBody}>
                <span className={styles.mainTime}>{timeStr}</span>
             </div>
             <div className={styles.clockCardFooter}>
                <span className={styles.shortDate}>{date}</span>
                {isDay ? <Sun size={10} color="#f59e0b" /> : <Moon size={10} color="#94a3b8" />}
             </div>
          </div>
        );
      })}
    </div>
  );
});

GlobalClockTicker.displayName = 'GlobalClockTicker';

const categorizeNews = (title: string, content: string) => {
  const text = (title + ' ' + content).toLowerCase();
  if (text.includes('금리') || text.includes('인플레') || text.includes('cpi') || text.includes('연준') || text.includes('파월')) return { label: '거시', color: '#8b5cf6' };
  if (text.includes('비트코인') || text.includes('코인') || text.includes('암호화폐') || text.includes('이더리움')) return { label: '코인', color: '#f59e0b' };
  if (text.includes('정치') || text.includes('대통령') || text.includes('선거') || text.includes('규제')) return { label: '정치', color: '#ec4899' };
  if (text.includes('증시') || text.includes('주식') || text.includes('나스닥') || text.includes('실적')) return { label: '경제', color: '#3b82f6' };
  return { label: '속보', color: '#10b981' };
};

const checkImportance = (title: string) => {
  const text = title.toLowerCase();
  return text.includes('속보') || text.includes('급락') || text.includes('폭등') || text.includes('경고') || text.includes('단독') || text.includes('최초');
};

const BreakingNewsTicker = memo(({ news }: { news: any[] }) => {
  if (!news || news.length === 0) return null;

  return (
    <div className={styles.tickerOuter}>
      <div className={styles.tickerLabel}>
        <Activity size={12} /> BREAKING
      </div>
      <div className={styles.tickerWrap}>
        <div className={styles.tickerInner}>
          {[...news, ...news].map((item, i) => {
            const isUrgent = item.importance === 'URGENT';
            const sentimentColor = item.sentiment === 'POSITIVE' ? '#10b981' : item.sentiment === 'NEGATIVE' ? '#f43f5e' : '#94a3b8';
            
            return (
              <div key={`${item.id}-${i}`} className={styles.tickerItem} onClick={() => window.dispatchEvent(new CustomEvent('open-news-drawer', { detail: item }))}>
                {isUrgent && <span className={styles.urgentDot} />}
                <span className={styles.tickerSource}>{item.source}</span>
                <span className={styles.tickerTitle}>{item.title}</span>
                <div className={styles.sentimentLine} style={{ backgroundColor: sentimentColor }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

BreakingNewsTicker.displayName = 'BreakingNewsTicker';

export default function Dashboard() {
  const [theme, setTheme] = useState('dark'); // 기본값을 다크로 변경
  const [country, setCountry] = useState('KR');
  const [topic, setTopic] = useState('ALL');
  const [page, setPage] = useState(1);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [activeTab, setActiveTab] = useState<'market' | 'macro' | 'flow'>('market');
  const [mounted, setMounted] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);

  // 로컬 스토리지에서 상태 복구
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('terminal-theme') || 'dark';
    const savedTab = localStorage.getItem('terminal-active-tab') as any;
    const savedCountry = localStorage.getItem('terminal-country');
    const savedTopic = localStorage.getItem('terminal-topic');

    if (savedTheme) setTheme(savedTheme);
    if (savedTab) setActiveTab(savedTab);
    if (savedCountry) setCountry(savedCountry);
    if (savedTopic) setTopic(savedTopic);
  }, []);

  // 상태 변경 시 로컬 스토리지 저장
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('terminal-theme', theme);
    localStorage.setItem('terminal-active-tab', activeTab);
    localStorage.setItem('terminal-country', country);
    localStorage.setItem('terminal-topic', topic);
    localStorage.setItem('terminal-view-mode', viewMode);
    localStorage.setItem('terminal-category', activeCategory);
  }, [theme, activeTab, country, topic, mounted, viewMode, activeCategory]);

  useEffect(() => {
    if (!mounted) return;
    const savedCategory = localStorage.getItem('terminal-category');
    if (savedCategory) setActiveCategory(savedCategory);
  }, [mounted]);

  const fetchNews = useCallback(async (c: string, t: string, p: number, background = false) => {
    if (!background) setLoading(true);
    setIsRefreshing(true);
    setError('');

    const startTime = Date.now();
    try {
      const res = await fetch(`/api/news?category=${c}&topic=${t}&page=${p}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();

      setLatency(Date.now() - startTime);
      // ID 배열로 경량 비교 (JSON.stringify 대비 훨씬 빠름)
      const fetchedItems: NewsItem[] = data.items || [];
      const items = fetchedItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      
      setNews(prev => {
        if (prev.length === items.length && prev.every((n, i) => n.id === items[i]?.id)) return prev;
        return items;
      });
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
    }, 15000); // 15초 폴링 (긴급 속보 실시간 즉각 배치 반영)
    return () => clearInterval(interval);
  }, [country, topic, page, fetchNews]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleOpenNews = (e: any) => setSelectedNews(e.detail);
    window.addEventListener('open-news-drawer', handleOpenNews);
    return () => window.removeEventListener('open-news-drawer', handleOpenNews);
  }, []);

  const handlePageChange = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className={styles.dashboard} data-theme={theme}>
      <div className={styles.headerLayout}>
        <div className={styles.brandSection}>
          <div className={styles.brandTop}>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={styles.liveBadge}
            >
              <Zap size={10} fill="currentColor" />
              TERMINAL LIVE
            </motion.div>
            <div className={styles.statusDivider} />
            <div className={styles.systemStatus}>
               <div className={styles.statusDotActive} />
               <span>STABLE</span>
            </div>
          </div>
          
          <h2 className={styles.title}>Global Market <span className="gradient-text">Terminal</span></h2>
          <p className={styles.subtitle}>실시간 거시경제·퀀트 및 크립토 데이터 인텔리전스</p>
          
          <div className={styles.headerActionRow}>
            <button className={styles.primaryActionBtn} onClick={() => setGlossaryModalOpen(true)}>
              <Info size={14} /> 초보자 가이드
            </button>
            <MoneyFlowSummary />
            <div className={styles.actionDivider} />
            <button
              onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              className={styles.themeToggleBtn}
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
            </button>
          </div>
        </div>

        <div className={styles.worldClockSection}>
          <div className={styles.sectionHeader}>
            <Clock size={12} />
            <span>GLOBAL MARKET HOURS</span>
          </div>
          <GlobalClockTicker />
        </div>
      </div>

      <div className={styles.tickerSection}>
        <BreakingNewsTicker news={news.slice(0, 10)} />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={styles.gridContainer}
        style={{ marginTop: '1.5rem' }}
      >
        <div className={styles.newsSection}>
          <MacroDashBar />
          
          <FilterBar
            country={country}
            setCountry={(c) => { setCountry(c); setPage(1); }}
            topic={topic}
            setTopic={(t) => { setTopic(t); setPage(1); }}
            activeCategoryId={activeCategory}
            setActiveCategory={(catId) => {
              setActiveCategory(catId);
              setPage(1);
              if (catId.includes('CRYPTO')) setActiveTab('market');
              if (catId.includes('MACRO')) setActiveTab('macro');
            }}
            onRefresh={() => fetchNews(country, topic, page)}
            isRefreshing={isRefreshing}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />

          {error && <div className={styles.errorBanner}>{error}</div>}

          <div className={viewMode === 'card' ? styles.newsGrid : styles.newsGridList}>
            {loading && !isRefreshing ? (
              Array.from({ length: 12 }).map((_, i) => (
                <NewsSkeleton key={`skeleton-${i}`} isListMode={viewMode === 'list'} />
              ))
            ) : news && news.length > 0 ? (
              <AnimatePresence mode="popLayout" initial={false}>
                {news.map((item: any) => (
                  <NewsCard
                    key={item.id}
                    item={item}
                    onClick={setSelectedNews}
                    isListMode={viewMode === 'list'}
                  />
                ))}
              </AnimatePresence>
            ) : (
              <div className={styles.emptyState}>
                <p>해당 카테고리의 최신 뉴스를 찾을 수 없습니다.</p>
                <button onClick={() => fetchNews(country, topic, page)} className={styles.retryBtn}>
                  다시 시도하기
                </button>
              </div>
            )}
          </div>

          {!loading && totalPages > 1 && (
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
        </div>

        <div className={styles.widgetSection}>
          <div className={styles.widgetTabs}>
            <button
              onClick={() => setActiveTab('market')}
              className={`${styles.widgetTabBtn} ${activeTab === 'market' ? styles.widgetTabBtnActive : ''}`}
            >
              <Activity size={14} /> <span>마켓</span>
            </button>
            <button
              onClick={() => setActiveTab('macro')}
              className={`${styles.widgetTabBtn} ${activeTab === 'macro' ? styles.widgetTabBtnActive : ''}`}
            >
              <Globe size={14} /> <span>거시경제</span>
            </button>
            <button
              onClick={() => setActiveTab('flow')}
              className={`${styles.widgetTabBtn} ${activeTab === 'flow' ? styles.widgetTabBtnActive : ''}`}
            >
              <Zap size={14} /> <span>오더플로우</span>
            </button>
          </div>

          <div className={styles.widgetContent}>
            {/* Always keep components mounted to maintain real-time data connection, but hide when inactive */}
            <div className={styles.tabPanel} style={{ display: activeTab === 'market' ? 'flex' : 'none' }}>
              <MarketWidget />
              <SentimentWidget />
            </div>

            <div className={styles.tabPanel} style={{ display: activeTab === 'macro' ? 'flex' : 'none' }}>
              <EconomicCalendar />
              <MacroWidget />
              <TradeWidget />
            </div>

            <div className={styles.tabPanel} style={{ display: activeTab === 'flow' ? 'flex' : 'none' }}>
              <WhaleTradesWidget />
              <CryptoVolumeWidget />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Pro Status Bar */}
      <footer className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <div className={styles.statusItem}>
            <div className={styles.pulse} />
            <span>터미널 활성 상태</span>
          </div>
          <div className={styles.statusSeparator} />
          <div className={styles.statusItem}>
            <Wifi size={12} color={latency !== null && latency < 500 ? "#22c55e" : "#f59e0b"} />
            <span>응답 속도: {latency !== null ? `${latency}ms` : '측정 중...'}</span>
          </div>
        </div>
        <div className={styles.statusRight}>
          <div className={styles.statusItem}>
            <Cpu size={12} />
            <span>노드: {mounted ? '서울-KOREA-01' : '연결 중...'}</span>
          </div>
          <div className={styles.statusSeparator} />
          <div className={styles.statusItem}>
            <Clock size={12} />
            <span suppressHydrationWarning>마지막 동기화: {mounted ? new Date().toLocaleTimeString('ko-KR') : '--:--:--'}</span>
          </div>
        </div>
      </footer>

      {/* Glossary Modal */}
      <AnimatePresence>
        {glossaryModalOpen && (
          <motion.div 
            className={styles.modalBackdrop} 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setGlossaryModalOpen(false)}
          >
            <motion.div 
              className={styles.glossaryModalContent} 
              initial={{ scale: 0.95, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 50 }}
              onClick={e => e.stopPropagation()}
            >
              <h3>💡 필수 금융 용어 3가지</h3>
              <p>마켓 터미널을 이해하기 위한 핵심 개념입니다.</p>
              <ul>
                <li><b style={{ color: '#8b5cf6' }}>거시경제(Macro)</b> 금리나 인플레이션 등 글로벌 자본의 큰 흐름</li>
                <li><b style={{ color: '#3b82f6' }}>퀀트(Quant)</b> 트레이딩 데이터를 수학 및 통계 기반으로 분석한 지표</li>
                <li><b style={{ color: '#f59e0b' }}>오더플로우(Order Flow)</b> 실시간 매수/매도 압력과 대규모 자금 체결 추적</li>
              </ul>
              <button 
                className={styles.glossaryCloseBtn} 
                onClick={() => setGlossaryModalOpen(false)}
              >
                닫기
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <NewsDrawer
        item={selectedNews}
        onClose={() => setSelectedNews(null)}
      />

      <AlertManager />
    </main>
  );
}
