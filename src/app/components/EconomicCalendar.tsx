import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import styles from './Widget.module.css';
import WidgetSkeleton from './WidgetSkeleton';

interface EconomicEvent {
  id: string;
  time: string;
  country: string;
  event: string;
  impact: 'High' | 'Medium' | 'Low';
  forecast?: string;
  previous?: string;
}

const MOCK_EVENTS: EconomicEvent[] = [
  { id: '1', time: '10:30', country: '미국', event: '소비자물가지수 (CPI) 전월 대비', impact: 'High', forecast: '0.3%', previous: '0.4%' },
  { id: '2', time: '14:00', country: '유럽', event: '라가르드 ECB 총재 연설', impact: 'Medium' },
  { id: '3', time: '16:30', country: '미국', event: '신규 실업수당 청구건수', impact: 'High', forecast: '215K', previous: '212K' },
  { id: '4', time: '19:00', country: '영국', event: '영국은행(BOE) 금리 결정', impact: 'High', forecast: '5.25%', previous: '5.25%' },
  { id: '5', time: '21:00', country: '미국', event: '연방 예산 수지', impact: 'Low', forecast: '-$30B', previous: '-$22B' },
];

const IMPACT_LABELS = {
  High: '고',
  Medium: '중',
  Low: '저'
};

const NowTimelineMarker = () => (
  <motion.div 
    initial={{ opacity: 0, scaleX: 0 }}
    animate={{ opacity: 1, scaleX: 1 }}
    style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.8rem', 
      margin: '0.25rem 0',
      position: 'relative',
      padding: '0.5rem 0',
      zIndex: 10
    }}
  >
    <div style={{ flex: 1, height: '2px', background: 'var(--accent-gradient)', borderRadius: '2px', boxShadow: '0 0 10px var(--accent-glow)' }} />
    <div style={{ 
      fontSize: '0.6rem', 
      fontWeight: 1000, 
      color: 'white', 
      background: 'var(--accent-primary)', 
      padding: '0.2rem 0.6rem', 
      borderRadius: '20px',
      boxShadow: '0 0 12px var(--accent-glow)',
      whiteSpace: 'nowrap',
      letterSpacing: '0.05em'
    }}>
      NOW
    </div>
    <div style={{ flex: 1, height: '2px', background: 'var(--accent-gradient)', borderRadius: '2px', boxShadow: '0 0 10px var(--accent-glow)' }} />
  </motion.div>
);

export default function EconomicCalendar() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30000); // 30초마다 갱신
    return () => clearInterval(timer);
  }, []);

  if (!now) return <div style={{ height: '400px' }}><WidgetSkeleton /></div>;

  const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

  const handleViewAll = () => {
    window.open('https://kr.investing.com/economic-calendar/', '_blank');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={styles.widgetPanel}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Calendar size={18} style={{ color: 'var(--accent-primary)' }} />
          <h3 className={styles.widgetHeader} style={{ margin: 0 }}>경제 캘린더 (오늘)</h3>
        </div>
        <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--accent-primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
          KST {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
        {currentTimeInMinutes < (parseInt(MOCK_EVENTS[0].time.split(':')[0]) * 60 + parseInt(MOCK_EVENTS[0].time.split(':')[1])) && (
          <NowTimelineMarker />
        )}

        {MOCK_EVENTS.map((event, index) => {
          const [h, m] = event.time.split(':').map(Number);
          const eventTimeInMinutes = h * 60 + m;
          const isPast = eventTimeInMinutes < currentTimeInMinutes - 15;
          const isActive = Math.abs(eventTimeInMinutes - currentTimeInMinutes) <= 45;

          const nextEvent = MOCK_EVENTS[index + 1];
          const nextEventTime = nextEvent ? (parseInt(nextEvent.time.split(':')[0]) * 60 + parseInt(nextEvent.time.split(':')[1])) : 1440;
          const showNowLineAfter = currentTimeInMinutes >= eventTimeInMinutes && currentTimeInMinutes < nextEventTime;

          return (
            <React.Fragment key={event.id}>
              <motion.div
                whileHover={{ x: 4 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  padding: '1rem 1rem',
                  background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-glass)',
                  borderRadius: '12px',
                  border: isActive ? '2px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                  cursor: 'pointer',
                  opacity: isPast ? 0.35 : 1,
                  boxShadow: isActive ? '0 0 20px rgba(99,102,241,0.15)' : 'none',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.25s ease'
                }}
              >
                {isActive && (
                  <div style={{ position: 'absolute', top: '0.5rem', right: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ width: '6px', height: '6px', background: '#ef4444', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                    <span style={{ fontSize: '0.6rem', fontWeight: 950, color: '#ef4444', letterSpacing: '0.04em' }}>LIVE</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '0.9rem', color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                      {event.time}
                    </span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', background: 'rgba(255,255,255,0.04)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                      {event.country}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', fontWeight: 900, color: event.impact === 'High' ? '#ef4444' : event.impact === 'Medium' ? '#f59e0b' : '#22c55e' }}>
                    <AlertTriangle size={11} />
                    {IMPACT_LABELS[event.impact as keyof typeof IMPACT_LABELS]}
                  </div>
                </div>

                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                  {event.event}
                </div>

                {(event.forecast || event.previous) && (
                  <div style={{ display: 'flex', gap: '1.2rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {event.forecast && <span>예측 <b style={{ color: 'var(--text-primary)', fontWeight: 900, marginLeft: '0.15rem' }}>{event.forecast}</b></span>}
                    {event.previous && <span>이전 <b style={{ color: 'var(--text-primary)', fontWeight: 900, marginLeft: '0.15rem' }}>{event.previous}</b></span>}
                  </div>
                )}
              </motion.div>

              {showNowLineAfter && <NowTimelineMarker />}
            </React.Fragment>
          );
        })}
      </div>

      <button 
        onClick={handleViewAll}
        style={{ 
          marginTop: '1.2rem', 
          width: '100%', 
          padding: '0.8rem', 
          background: 'rgba(255,255,255,0.02)', 
          border: '1px solid var(--border-glass)',
          borderRadius: '12px',
          color: 'var(--text-secondary)',
          fontSize: '0.8rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.42rem',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'pointer'
        }} className="hover-lift">
        전체 일정 보기 <ChevronRight size={14} />
      </button>
    </motion.div>
  );
}
