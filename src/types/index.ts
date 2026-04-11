/**
 * 프로젝트 전반에서 사용되는 공유 타입 정의
 */

export interface NewsItem {
  id: string;
  title: string;
  originalTitle?: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  source: string;
  thumbnail: string | null;
  lang: string;
  category?: string;
  importance: 'URGENT' | 'MAJOR' | 'NORMAL';
  impactScore: number;
  assets: string[];
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  clusterCount?: number;
}

export interface MarketAsset {
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
}

export interface MarketData {
  chart: {
    symbol: string;
    image: string;
    price: number;
    change: number;
  };
  marketCapList: MarketAsset[];
}

export interface MacroEvent {
  id: string;
  time: string;
  title: string;
  impact: 'low' | 'medium' | 'high';
  actual?: string;
  forecast?: string;
  previous?: string;
  country: string;
}

export interface ExchangeRate {
  pair: string;
  rate: number;
  change: number;
}

export interface MacroData {
  exchangeRates: ExchangeRate[];
  calendar: MacroEvent[];
}

export interface SentimentInfo {
  value: number;
  label: string;
  en: string;
  color: string;
  change?: number;
  previousValue?: number;
}

export interface SentimentData {
  crypto: SentimentInfo;
  stocks: {
    global: SentimentInfo;
    korea: SentimentInfo;
    japan: SentimentInfo;
    europe: SentimentInfo;
    china: SentimentInfo;
  };
  vix: number;
  lastUpdated: string;
}
