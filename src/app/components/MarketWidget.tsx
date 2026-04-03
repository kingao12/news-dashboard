import { useState, useEffect, useRef, memo, useCallback } from 'react';
import useSWR from 'swr';
import styles from './Widget.module.css';
import WidgetSkeleton from './WidgetSkeleton';
import { Coins, LineChart, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error('API Error');
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return d;
};

const INTERVALS = [
  { label: '1분', value: '1m' },
  { label: '5분', value: '5m' },
  { label: '15분', value: '15m' },
  { label: '1시간', value: '1h' },
  { label: '4시간', value: '4h' },
  { label: '일봉', value: '1d' },
  { label: '주봉', value: '1w' },
  { label: '월봉', value: '1M' }
];

declare global {
  interface Window {
    TradingView: any;
  }
}

const CHART_HEIGHT = 300;

const TradingViewChart = memo(
  ({
    symbol,
    theme,
    interval,
    isCrypto
  }: {
    symbol: string;
    theme: string;
    interval: string;
    isCrypto: boolean;
  }) => {
    const hostRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!hostRef.current) return;

      hostRef.current.innerHTML = '';

      const intervalMap: Record<string, string> = {
        '1m': '1',
        '5m': '5',
        '15m': '15',
        '1h': '60',
        '4h': '240',
        '1d': 'D',
        '1w': 'W',
        '1M': 'M'
      };

      const tvInterval = intervalMap[interval] || '1';

      const formattedSymbol = isCrypto
        ? `BINANCE:${symbol.toUpperCase()}USDT`
        : symbol.includes(':')
          ? symbol
          : `NASDAQ:${symbol}`;

      const widget = document.createElement('div');
      widget.id = 'tv_chart_container';
      widget.className = 'tradingview-widget-container__widget';
      widget.style.width = '100%';
      widget.style.height = `${CHART_HEIGHT}px`;

      const script = document.createElement('script');
      script.src =
        'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.type = 'text/javascript';
      script.async = true;

      const widgetConfig = {
        width: '100%',
        height: CHART_HEIGHT,
        symbol: formattedSymbol,
        interval: tvInterval,
        timezone: 'Asia/Seoul',
        theme: theme === 'dark' ? 'dark' : 'light',
        style: '1',
        locale: 'kr',
        enable_publishing: false,
        allow_symbol_change: false,
        calendar: false,
        support_host: 'https://www.tradingview.com',
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        container_id: 'tv_chart_container',
        studies: ['RSI@tv-basicstudies', 'MASimple@tv-basicstudies']
      };

      script.innerHTML = JSON.stringify(widgetConfig);

      hostRef.current.appendChild(widget);
      hostRef.current.appendChild(script);

      return () => {
        if (hostRef.current) hostRef.current.innerHTML = '';
      };
    }, [symbol, theme, interval, isCrypto]);

    return (
      <div
        ref={hostRef}
        className="tradingview-widget-container"
        style={{
          width: '100%',
          height: `${CHART_HEIGHT}px`,
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background:
              'radial-gradient(circle at center, rgba(99,102,241,0.05) 0%, transparent 70%)',
            zIndex: 1,
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              opacity: 0.5
            }}
          >
            <Activity
              size={32}
              className="live-indicator"
              style={{ color: 'var(--accent-primary)' }}
            />
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                color: 'var(--text-secondary)',
                letterSpacing: '0.1em'
              }}
            >
              INITIALIZING ENGINE...
            </span>
          </div>
        </div>
      </div>
    );
  }
);

TradingViewChart.displayName = 'TradingViewChart';

const LivePrice = ({
  basePrice,
  symbol,
  className,
  minWidth = '90px'
}: {
  basePrice: number;
  symbol: string;
  className?: string;
  minWidth?: string;
}) => {
  const [price, setPrice] = useState(basePrice);
  const [flashClass, setFlashClass] = useState('');
  const prevPrice = useRef(basePrice);

  useEffect(() => {
    const handlePriceUpdate = (e: any) => {
      if (
        typeof e.detail?.symbol === 'string' &&
        e.detail.symbol.toUpperCase() === symbol.toUpperCase()
      ) {
        const newPrice = e.detail.price;

        if (newPrice > prevPrice.current) setFlashClass('price-flash-up');
        else if (newPrice < prevPrice.current) setFlashClass('price-flash-down');

        setPrice(newPrice);
        prevPrice.current = newPrice;

        setTimeout(() => setFlashClass(''), 800);
      }
    };

    window.addEventListener('binance-price-update', handlePriceUpdate);
    return () =>
      window.removeEventListener('binance-price-update', handlePriceUpdate);
  }, [symbol]);

  useEffect(() => {
    if (basePrice > 0 && Math.abs(basePrice - price) / basePrice > 0.01) {
      setPrice(basePrice);
      prevPrice.current = basePrice;
    }
  }, [basePrice, price]);

  return (
    <span
      className={`${className || ''} ${flashClass} terminal-text`}
      style={{
        display: 'inline-block',
        minWidth,
        textAlign: 'right',
        flexShrink: 0,
        transition: 'color 0.4s ease'
      }}
    >
      ${price.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}
    </span>
  );
};

const AssetLogo = memo(
  ({ src, symbol, size = 22 }: { src?: string; symbol: string; size?: number }) => {
    const [error, setError] = useState(false);

    if (!src || error) {
      return (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size * 0.45,
            fontWeight: 600,
            color: '#94a3b8'
          }}
        >
          {symbol[0]}
        </div>
      );
    }

    return (
      <img
        src={src}
        alt=""
        onError={() => setError(true)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'contain',
          background: '#fff'
        }}
      />
    );
  }
);

AssetLogo.displayName = 'AssetLogo';

export default function MarketWidget() {
  const [activeTab, setActiveTab] = useState<'crypto' | 'domestic' | 'overseas'>(
    'crypto'
  );
  const [cryptoSymbol, setCryptoSymbol] = useState('BTC');
  const [domesticSymbol, setDomesticSymbol] = useState('005930');
  const [overseasSymbol, setOverseasSymbol] = useState('AAPL');
  const [interval, setIntervalVal] = useState('1m');
  const [cryptoRanking, setCryptoRanking] = useState<any[]>([]);
  const [domesticRanking, setDomesticRanking] = useState<any[]>([
    { id: 'samsung', symbol: '005930', name: '삼성전자', current_price: 0 },
    { id: 'hynix', symbol: '000660', name: 'SK하이닉스', current_price: 0 },
    { id: 'lgensol', symbol: '373220', name: 'LG에너지솔루션', current_price: 0 },
    { id: 'biologics', symbol: '207940', name: '삼성바이오로직스', current_price: 0 },
    { id: 'hyundai', symbol: '005380', name: '현대차', current_price: 0 },
    { id: 'naver', symbol: '035420', name: '네이버', current_price: 0 }
  ]);
  const [overseasRanking, setOverseasRanking] = useState<any[]>([
    { id: 'aapl', symbol: 'AAPL', name: 'Apple', current_price: 0 },
    { id: 'nvda', symbol: 'NVDA', name: 'NVIDIA', current_price: 0 },
    { id: 'msft', symbol: 'MSFT', name: 'Microsoft', current_price: 0 },
    { id: 'googl', symbol: 'GOOGL', name: 'Alphabet', current_price: 0 },
    { id: 'tsla', symbol: 'TSLA', name: 'Tesla', current_price: 0 }
  ]);

  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const check = () =>
      setIsDark(document.documentElement.getAttribute('data-theme') !== 'light');
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    return () => obs.disconnect();
  }, []);

  const cryptoEndpoint = `/api/crypto?symbol=${cryptoSymbol}&interval=${interval}`;
  const domesticEndpoint = `/api/stocks?symbol=${domesticSymbol}&interval=${interval}&market=kr`;
  const overseasEndpoint = `/api/stocks?symbol=${overseasSymbol}&interval=${interval}&market=us`;

  const {
    data: cryptoData,
    error: cryptoError,
    isLoading: cryptoLoading
  } = useSWR(cryptoEndpoint, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
    refreshInterval: activeTab === 'crypto' && interval === '1m' ? 3000 : 30000
  });

  const {
    data: domesticData,
    error: domesticError,
    isLoading: domesticLoading
  } = useSWR(activeTab === 'domestic' ? domesticEndpoint : null, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
    refreshInterval: interval === '1m' ? 5000 : 60000
  });

  const {
    data: overseasData,
    error: overseasError,
    isLoading: overseasLoading
  } = useSWR(activeTab === 'overseas' ? overseasEndpoint : null, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
    refreshInterval: interval === '1m' ? 5000 : 60000
  });

  useEffect(() => {
    if (activeTab !== 'crypto') return;

    let ws: WebSocket | null = null;
    let rafId: number | null = null;
    const batch = new Map<string, number>();

    const flush = () => {
      batch.forEach((price, symbol) => {
        window.dispatchEvent(
          new CustomEvent('binance-price-update', { detail: { symbol, price } })
        );
      });
      batch.clear();
      rafId = null;
    };

    const connectWS = () => {
      ws = new WebSocket('wss://fstream.binance.com/ws/!miniTicker@arr');

      ws.onmessage = event => {
        const data = JSON.parse(event.data);
        if (Array.isArray(data)) {
          data.forEach((ticker: any) => {
            batch.set(ticker.s.replace('USDT', ''), parseFloat(ticker.c));
          });
          if (rafId === null) rafId = requestAnimationFrame(flush);
        }
      };

      ws.onclose = () => setTimeout(connectWS, 3000);
    };

    connectWS();

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      ws?.close();
    };
  }, [activeTab]);

  useEffect(() => {
    if (cryptoData?.marketCapList) setCryptoRanking(cryptoData.marketCapList);
  }, [cryptoData]);

  useEffect(() => {
    if (domesticData?.marketCapList) setDomesticRanking(domesticData.marketCapList);
  }, [domesticData]);

  useEffect(() => {
    if (overseasData?.marketCapList) setOverseasRanking(overseasData.marketCapList);
  }, [overseasData]);

  const data =
    activeTab === 'crypto'
      ? cryptoData
      : activeTab === 'domestic'
        ? domesticData
        : overseasData;

  const isLoading =
    activeTab === 'crypto'
      ? cryptoLoading
      : activeTab === 'domestic'
        ? domesticLoading
        : overseasLoading;

  const error =
    activeTab === 'crypto'
      ? cryptoError
      : activeTab === 'domestic'
        ? domesticError
        : overseasError;

  const handleTabChange = useCallback((tab: 'crypto' | 'domestic' | 'overseas') => {
    setActiveTab(tab);
  }, []);

  const handleRankingClick = useCallback(
    (item: any) => {
      if (activeTab === 'crypto') setCryptoSymbol(item.symbol);
      else if (activeTab === 'domestic') setDomesticSymbol(item.symbol);
      else setOverseasSymbol(item.symbol);
    },
    [activeTab]
  );

  const getCurrentSymbol = () => {
    if (activeTab === 'crypto') return cryptoSymbol;
    if (activeTab === 'domestic') return `KRX:${domesticSymbol}`;
    return `NASDAQ:${overseasSymbol}`;
  };

  const rankingList =
    activeTab === 'crypto'
      ? cryptoRanking
      : activeTab === 'domestic'
        ? domesticRanking
        : overseasRanking;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={styles.widgetPanel}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <div className={styles.tabContainer}>
        <div style={{ display: 'flex', gap: '0.4rem', width: '100%' }}>
          <button
            onClick={() => handleTabChange('crypto')}
            className={`${styles.tabButton} ${activeTab === 'crypto' ? styles.tabButtonActive : ''
              }`}
            style={{ flex: 1 }}
          >
            <Coins size={14} /> 코인
          </button>
          <button
            onClick={() => handleTabChange('domestic')}
            className={`${styles.tabButton} ${activeTab === 'domestic' ? styles.tabButtonActive : ''
              }`}
            style={{ flex: 1 }}
          >
            <Activity size={14} /> 국내주식
          </button>
          <button
            onClick={() => handleTabChange('overseas')}
            className={`${styles.tabButton} ${activeTab === 'overseas' ? styles.tabButtonActive : ''
              }`}
            style={{ flex: 1 }}
          >
            <LineChart size={14} /> 해외주식
          </button>
        </div>
      </div>

      <div className={styles.intervalBar}>
        {INTERVALS.map(i => (
          <button
            key={i.value}
            onClick={() => setIntervalVal(i.value)}
            className={`${styles.intervalBtn} ${interval === i.value ? styles.intervalActive : ''
              }`}
          >
            {i.label}
          </button>
        ))}
      </div>

      <div className={styles.chartSection}>
        {isLoading && !data ? (
          <div style={{ padding: '1rem' }}>
            <WidgetSkeleton />
          </div>
        ) : error ? (
          <div className={styles.widgetError}>데이터를 불러올 수 없습니다.</div>
        ) : data?.chart ? (
          <>
            <div
              className={styles.cryptoHeader}
              style={{ marginBottom: '0.4rem', padding: '0 0.5rem' }}
            >
              <div className={styles.cryptoPrice}>
                <AssetLogo src={data.chart.image} symbol={data.chart.symbol} size={28} />
                <span
                  className={styles.symbol}
                  style={{ fontSize: '0.9rem', marginLeft: '0.4rem' }}
                >
                  {data.chart.symbol}
                </span>
                <span
                  className={styles.price}
                  style={{
                    fontSize: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0
                  }}
                >
                  {activeTab === 'crypto' ? (
                    <LivePrice
                      basePrice={data.chart.price}
                      symbol={data.chart.symbol}
                      minWidth="150px"
                    />
                  ) : (
                    <span style={{ minWidth: '150px', textAlign: 'right' }}>
                      {activeTab === 'domestic' ? '₩' : '$'}
                      {data.chart.price.toLocaleString()}
                    </span>
                  )}
                </span>
              </div>

              <div
                className={`${styles.cryptoChangeBadge} ${data.chart.change >= 0 ? styles.plusBg : styles.minusBg
                  }`}
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
              >
                {data.chart.change.toFixed(2)}%
              </div>
            </div>

            <div
              style={{
                width: '100%',
                minHeight: `${CHART_HEIGHT}px`,
                height: `${CHART_HEIGHT}px`,
                position: 'relative',
                borderRadius: '8px',
                overflow: 'hidden',
                flexShrink: 0
              }}
            >
              <TradingViewChart
                symbol={getCurrentSymbol()}
                theme={isDark ? 'dark' : 'light'}
                interval={interval}
                isCrypto={activeTab === 'crypto'}
              />
            </div>
          </>
        ) : (
          <div className={styles.widgetError}>데이터가 존재하지 않습니다.</div>
        )}
      </div>

      <div className={styles.rankingList}>
        {rankingList.map((item: any, idx: number) => (
          <div
            key={item.id || item.symbol}
            className={styles.rankingItem}
            onClick={() => handleRankingClick(item)}
          >
            <div className={styles.rankInfo}>
              <span className={styles.rankIndex}>{idx + 1}</span>
              <AssetLogo src={item.image} symbol={item.symbol} size={22} />
              <span className={styles.rankSymbol}>{item.symbol}</span>
              <span
                className={styles.rankName}
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary)',
                  display: 'none'
                }}
              >
                {item.name}
              </span>
            </div>

            <div className={styles.rankPriceCol}>
              <div className={styles.rankPrice}>
                {activeTab === 'crypto' ? (
                  <LivePrice basePrice={item.current_price} symbol={item.symbol} />
                ) : (
                  <span>
                    {activeTab === 'domestic' ? '₩' : '$'}
                    {item.current_price?.toLocaleString() || '---'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
