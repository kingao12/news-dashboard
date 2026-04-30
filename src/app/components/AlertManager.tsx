'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Zap, TrendingUp, TrendingDown, ShieldAlert, Activity } from 'lucide-react';
import styles from './AlertManager.module.css';

interface Alert {
  id: string;
  type: 'whale' | 'macro' | 'price' | 'intelligence';
  importance: 'normal' | 'important' | 'urgent';
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
    
    // Auto remove after 10 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== newAlert.id));
    }, 10000);
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
          { type: 'whale', importance: 'important', title: 'WHALE MOVEMENT', content: '1,250 BTC ($82M) 이체 포착 - Cold Wallet ➔ Binance', symbol: 'BTC' },
          { type: 'macro', importance: 'urgent', title: 'URGENT MACRO', content: '미국 CPI 발표: 예상치 상회 (+3.4%) - 시장 변동성 급증', symbol: 'US10Y' },
          { type: 'intelligence', importance: 'normal', title: 'AI INSIGHT', content: '엔비디아 관련 뉴스 감성 지수 급등 (+85%) 포착', symbol: 'NVDA' },
          { type: 'price', importance: 'important', title: 'VOLATILITY ALERT', content: '달러 인덱스(DXY) 105.2 오버슈팅 발생', symbol: 'DXY' }
        ];
        const randomMock = mocks[Math.floor(Math.random() * mocks.length)];
        addAlert(randomMock as any);
      }
    }, 18000);

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
            initial={{ opacity: 0, x: 100, scale: 0.9, rotateY: 20 }}
            animate={{ 
              opacity: 1, 
              x: 0, 
              scale: 1, 
              rotateY: 0,
              boxShadow: alert.importance === 'urgent' 
                ? '0 10px 30px rgba(239, 68, 68, 0.4)' 
                : '0 4px 15px rgba(0, 0, 0, 0.2)'
            }}
            exit={{ opacity: 0, x: 20, scale: 0.9, filter: 'blur(5px)' }}
            className={`${styles.alertCard} ${styles[alert.importance]} ${alert.importance === 'urgent' ? styles.pulse : ''}`}
            onClick={() => {
                if (alert.symbol) {
                    window.dispatchEvent(new CustomEvent('change-market-symbol', { detail: { symbol: alert.symbol } }));
                }
                removeAlert(alert.id);
            }}
          >
            <div className={styles.alertHeader}>
              <div className={styles.typeIcon}>
                {alert.importance === 'urgent' ? <ShieldAlert size={14} /> : <Zap size={14} />}
              </div>
              <span className={styles.alertTitle}>{alert.title}</span>
              <span className={styles.alertTime}>{alert.time}</span>
              <button className={styles.closeBtn} onClick={(e) => { e.stopPropagation(); removeAlert(alert.id); }}>
                <X size={14} />
              </button>
            </div>
            <div className={styles.alertContent}>{alert.content}</div>
            {alert.symbol && (
                <div className={styles.viewChartAction}>
                    <Activity size={12} />
                    VIEW {alert.symbol} CHART ↗
                </div>
            )}
            <div className={`${styles.progressTimer} ${styles[alert.importance + 'Timer']}`} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});

AlertManager.displayName = 'AlertManager';

export default AlertManager;
