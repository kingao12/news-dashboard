/**
 * MarketSocketService
 * ─────────────────────────────────────────────────────────────────
 * 규칙: WebSocket → 이 서비스 → Zustand store.setPrice()
 *       컴포넌트는 store를 구독하기만 하고, WS를 직접 열지 않는다.
 */
import { useMarketStore } from '../store/useMarketStore';

const DEFAULT_SYMBOLS = [
  'BTC', 'ETH', 'SOL', 'BNB', 'XRP',
  'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC',
];

class MarketSocketService {
  private ws: WebSocket | null = null;
  private symbols: string[] = DEFAULT_SYMBOLS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isIntentionalClose = false;

  /** 구독할 심볼 목록 동적 갱신 후 재연결 */
  setSymbols(symbols: string[]) {
    const upper = symbols.map((s) => s.toUpperCase().replace('USDT', ''));
    if (JSON.stringify(upper) === JSON.stringify(this.symbols)) return;
    this.symbols = upper;
    this.reconnect();
  }

  connect() {
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) return;

    const streams = this.symbols
      .map((s) => `${s.toLowerCase()}usdt@miniTicker`)
      .join('/');

    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    try {
      this.ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log('[MarketSocket] Connected ✓');
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string);
        // 복합 스트림: { stream: "btcusdt@miniTicker", data: {...} }
        const ticker = msg?.data ?? msg;
        if (!ticker?.s || !ticker?.c) return;

        const symbol = ticker.s.replace('USDT', ''); // 'BTCUSDT' → 'BTC'
        const priceUSD = parseFloat(ticker.c);
        const open = parseFloat(ticker.o ?? ticker.c);
        const change24h = open > 0 ? ((priceUSD - open) / open) * 100 : 0;

        // ✅ 유일한 입구: store.setPrice
        useMarketStore.getState().setPrice(symbol, priceUSD, change24h);

        // 레거시 이벤트 (점진적 제거 대상)
        window.dispatchEvent(
          new CustomEvent('market-asset-price-update', {
            detail: { symbol, price: priceUSD },
          })
        );
      } catch (_) {
        // JSON 파싱 실패 무시
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };

    this.ws.onclose = () => {
      this.ws = null;
      if (!this.isIntentionalClose) {
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect(delayMs = 3000) {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delayMs);
  }

  private reconnect() {
    this.disconnect();
    setTimeout(() => this.connect(), 500);
  }

  disconnect() {
    this.isIntentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isIntentionalClose = false;
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const marketSocket = new MarketSocketService();
