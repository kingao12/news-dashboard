'use client';

import { useEffect, useRef } from 'react';
import { marketSocket } from '@/services/marketSocket';
import { useMarketStore } from '@/store/useMarketStore';

/**
 * 앱 최상단에서 1회만 호출하는 초기화 훅.
 * 담당:
 *  1. WebSocket 연결 (Binance)
 *  2. 환율 주기적 갱신 (/api/exchange-rate)
 */
export function useMarketData() {
  const setExchangeRate = useMarketStore((s) => s.setExchangeRate);
  const fetchedOnce = useRef(false);

  // ── 환율 갱신 ─────────────────────────────────────────────────
  async function refreshRate() {
    try {
      const res = await fetch('/api/exchange-rate');
      if (!res.ok) return;
      const data = await res.json();
      if (data.usdKrw && data.usdKrw > 0) {
        setExchangeRate(data.usdKrw);
      }
    } catch (_) {
      // 실패 시 기존 store 값 유지
    }
  }

  useEffect(() => {
    // 최초 1회 즉시 가져오기
    if (!fetchedOnce.current) {
      fetchedOnce.current = true;
      refreshRate();
    }

    // 30초마다 환율 갱신
    const rateInterval = setInterval(refreshRate, 30_000);

    // WebSocket 연결
    marketSocket.connect();

    return () => {
      clearInterval(rateInterval);
      marketSocket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
