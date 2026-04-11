'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Zap, TrendingUp, TrendingDown, ShieldAlert, Activity } from 'lucide-react';
import styles from './AlertManager.module.css';

interface Alert {
  id: string;
  type: 'whale' | 'macro' | 'price' | 'intelligence';
  title: string;
  content: string;
  time: string;
  symbol?: string;
}

const AlertManager = memo(() => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const addAlert = useCallback((alert: Omit<Alert, 'id' | 'time'>) => {
    const newAlert: Alert = {
      ...alert,
      id: Math.random().toString(36).substr(2, 9),
      time: new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setAlerts(prev => [newAlert, ...prev].slice(0, 5));
    
    // Auto remove after 8 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== newAlert.id));
    }, 8000);
  }, []);

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  useEffect(() => {
    // Listen for global alerts
    const handleGlobalAlert = (e: any) => {
      addAlert(e.detail);
    };
    window.addEventListener('global-alert', handleGlobalAlert);

    // Mock Intelligence Feed (For Demo)
    const mockInterval = setInterval(() => {
      const chance = Math.random();
      if (chance > 0.85) {
        const mocks = [
          { type: 'whale', title: 'WHALE MOVEMENT', content: '1,250 BTC ($82M) 이체 포착 - Cold Wallet ➔ Binance', symbol: 'BTC' },
          { type: 'macro', title: 'MACRO ALERT', content: '미국 10년물 국채 금리 4.35% 돌파 - 변동성 주의', symbol: 'US10Y' },
          { type: 'intelligence', title: 'AI INSIGHT', content: '엔비디아 관련 뉴스 감성 지수 급등 (+85%) 포착', symbol: 'NVDA' },
          { type: 'price', title: 'PRICE BREAK', content: '달러 인덱스(DXY) 105.2 오버슈팅 발생', symbol: 'DXY' }
        ];
        const randomMock = mocks[Math.floor(Math.random() * mocks.length)];
        addAlert(randomMock as any);
      }
    }, 15000);

    return () => {
      window.removeEventListener('global-alert', handleGlobalAlert);
      clearInterval(mockInterval);
    };
  }, [addAlert]);

  return (
    <div className={styles.alertContainer}>
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className={`${styles.alertCard} ${styles[alert.type]}`}
            onClick={() => {
                if (alert.symbol) {
                    window.dispatchEvent(new CustomEvent('change-market-symbol', { detail: { symbol: alert.symbol } }));
                }
                removeAlert(alert.id);
            }}
          >
            <div className={styles.alertHeader}>
              <div className={styles.typeIcon}>
                {alert.type === 'whale' && <Activity size={14} />}
                {alert.type === 'macro' && <ShieldAlert size={14} />}
                {alert.type === 'intelligence' && <Zap size={14} />}
                {alert.type === 'price' && <TrendingUp size={14} />}
              </div>
              <span className={styles.alertTitle}>{alert.title}</span>
              <span className={styles.alertTime}>{alert.time}</span>
              <button className={styles.closeBtn} onClick={(e) => { e.stopPropagation(); removeAlert(alert.id); }}>
                <X size={14} />
              </button>
            </div>
            <div className={styles.alertContent}>{alert.content}</div>
            {alert.symbol && (
                <div className={styles.alertAction}>
                    VIEW {alert.symbol} CHART ↗
                </div>
            )}
            <div className={styles.progressTimer} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});

AlertManager.displayName = 'AlertManager';

export default AlertManager;
