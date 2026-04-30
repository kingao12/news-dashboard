import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────
export interface CandlePoint {
  time: number;   // UNIX timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface SymbolState {
  priceUSD: number;
  priceKRW: number;
  change24h: number;      // percent
  history: number[];      // 최근 60개 close 가격 (USD)
}

interface MarketStore {
  // ── 원본 데이터 ──────────────────────────────
  symbols: Record<string, SymbolState>;

  // ── 파생 / UI 상태 ─────────────────────────
  exchangeRate: number;      // USD → KRW
  currency: 'KRW' | 'USD';

  // 선택된 심볼 (탭별)
  selectedSymbols: {
    crypto: string;
    domestic: string;
    overseas: string;
  };

  // ── 레거시 호환 (점진적 제거) ──────────────
  /** @deprecated use symbols[sym].priceUSD instead */
  prices: Record<string, number>;
  /** @deprecated use symbols[sym].history instead */
  priceHistories: Record<string, number[]>;
  usdKrw: number;            // alias for exchangeRate
  currencyMode: 'KRW' | 'USD';  // alias for currency

  // ── Actions ────────────────────────────────
  /** WebSocket → 이 메서드로만 가격 반영 */
  setPrice: (symbol: string, priceUSD: number, change24h?: number) => void;
  setExchangeRate: (rate: number) => void;
  setCurrency: (c: 'KRW' | 'USD') => void;
  toggleCurrency: () => void;
  setSelectedSymbol: (tab: 'crypto' | 'domestic' | 'overseas', symbol: string) => void;

  // 레거시 alias
  setUsdKrw: (rate: number) => void;
  setCurrencyMode: (mode: 'KRW' | 'USD') => void;
  toggleCurrencyMode: () => void;

  // 파생값 헬퍼
  getDisplay: (symbol: string) => {
    price: number;
    formatted: string;
    sub: string;
  };
}

// ─────────────────────────────────────────────
// 포매터 (순수 함수, store 외부 의존 없음)
// ─────────────────────────────────────────────
function fmtUSD(n: number): string {
  if (n >= 1000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${n.toFixed(6)}`;
}
function fmtKRW(n: number): string {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(2)}억`;
  if (n >= 10_000) return `₩${n.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
  return `₩${n.toFixed(0)}`;
}

// ─────────────────────────────────────────────
// Store 생성
// ─────────────────────────────────────────────
export const useMarketStore = create<MarketStore>()(
  persist(
    (set, get) => ({
      symbols: {},
      exchangeRate: 1380,
      currency: 'KRW',
      selectedSymbols: { crypto: 'BTC', domestic: '005930', overseas: 'AAPL' },

      // 레거시
      prices: {},
      priceHistories: {},
      usdKrw: 1380,
      currencyMode: 'KRW',

      // ── setPrice: WebSocket 전용 엔트리포인트 ──
      setPrice: (symbol, priceUSD, change24h = 0) =>
        set((state) => {
          const rate = state.exchangeRate;
          const priceKRW = priceUSD * rate;
          const prev = state.symbols[symbol];
          const history = prev?.history ?? [];
          const newHistory = [...history, priceUSD].slice(-60);

          const updated: SymbolState = { priceUSD, priceKRW, change24h, history: newHistory };

          return {
            symbols: { ...state.symbols, [symbol]: updated },
            // 레거시 동기화
            prices: { ...state.prices, [symbol]: priceUSD },
            priceHistories: { ...state.priceHistories, [symbol]: newHistory },
          };
        }),

      // ── setExchangeRate: 환율 갱신 (전체 KRW 재계산) ──
      setExchangeRate: (rate) =>
        set((state) => {
          // 기존 모든 심볼의 priceKRW 재계산
          const updatedSymbols = Object.fromEntries(
            Object.entries(state.symbols).map(([sym, s]) => [
              sym,
              { ...s, priceKRW: s.priceUSD * rate },
            ])
          );
          return {
            exchangeRate: rate,
            usdKrw: rate,          // 레거시 sync
            symbols: updatedSymbols,
          };
        }),

      setCurrency: (c) => set({ currency: c, currencyMode: c }),
      toggleCurrency: () =>
        set((s) => {
          const next = s.currency === 'KRW' ? 'USD' : 'KRW';
          return { currency: next, currencyMode: next };
        }),

      setSelectedSymbol: (tab, symbol) =>
        set((s) => ({ selectedSymbols: { ...s.selectedSymbols, [tab]: symbol } })),

      // 레거시 alias
      setUsdKrw: (rate) => get().setExchangeRate(rate),
      setCurrencyMode: (mode) => get().setCurrency(mode),
      toggleCurrencyMode: () => get().toggleCurrency(),

      // ── 파생값 헬퍼 ──
      getDisplay: (symbol) => {
        const state = get();
        const sym = state.symbols[symbol];
        const priceUSD = sym?.priceUSD ?? 0;
        const priceKRW = sym?.priceKRW ?? priceUSD * state.exchangeRate;

        if (state.currency === 'KRW') {
          return {
            price: priceKRW,
            formatted: fmtKRW(priceKRW),
            sub: fmtUSD(priceUSD),
          };
        }
        return {
          price: priceUSD,
          formatted: fmtUSD(priceUSD),
          sub: fmtKRW(priceKRW),
        };
      },
    }),
    {
      name: 'market-storage-v2',
      partialize: (state) => ({
        currency: state.currency,
        currencyMode: state.currencyMode,
        selectedSymbols: state.selectedSymbols,
        exchangeRate: state.exchangeRate,
      }),
    }
  )
);

// ─────────────────────────────────────────────
// 선택자 (성능 최적화 — 컴포넌트가 직접 사용)
// ─────────────────────────────────────────────
const EMPTY_ARRAY: number[] = [];

export const selectPrice = (symbol: string) => (state: MarketStore) =>
  state.symbols[symbol]?.priceUSD ?? state.prices[symbol] ?? 0;

export const selectPriceKRW = (symbol: string) => (state: MarketStore) =>
  state.symbols[symbol]?.priceKRW ?? (state.prices[symbol] ?? 0) * state.exchangeRate;

export const selectHistory = (symbol: string) => (state: MarketStore) =>
  state.symbols[symbol]?.history ?? state.priceHistories[symbol] ?? EMPTY_ARRAY;

export const selectCurrency = (state: MarketStore) => state.currency;
export const selectExchangeRate = (state: MarketStore) => state.exchangeRate;
