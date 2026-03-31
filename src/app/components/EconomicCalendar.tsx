import { motion } from 'framer-motion';
import { Calendar, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import styles from './Widget.module.css';

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

export default function EconomicCalendar() {
  const handleViewAll = () => {
    window.open('https://kr.investing.com/economic-calendar/', '_blank');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={styles.widgetPanel}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem' }}>
        <Calendar size={18} style={{ color: 'var(--accent-primary)' }} />
        <h3 className={styles.widgetHeader} style={{ margin: 0 }}>경제 캘린더 (오늘)</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {MOCK_EVENTS.map((event) => (
          <motion.div 
            key={event.id}
            whileHover={{ x: 5 }}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.6rem', 
              padding: '1rem', 
              background: 'var(--bg-glass)', 
              borderRadius: '12px',
              border: '1px solid var(--border-glass)',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ 
                  fontFamily: 'var(--font-mono)', 
                  fontWeight: 800, 
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)'
                }}>
                  {event.time}
                </span>
                <span style={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 900, 
                  color: '#94a3b8',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px'
                }}>
                  {event.country}
                </span>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.3rem',
                fontSize: '0.6rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                color: event.impact === 'High' ? '#ef4444' : event.impact === 'Medium' ? '#f59e0b' : '#22c55e'
              }}>
                <AlertTriangle size={10} />
                {IMPACT_LABELS[event.impact]}
              </div>
            </div>
            
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              {event.event}
            </div>

            {(event.forecast || event.previous) && (
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {event.forecast && <span>예측: <b style={{ color: 'var(--text-primary)' }}>{event.forecast}</b></span>}
                {event.previous && <span>이전: <b style={{ color: 'var(--text-primary)' }}>{event.previous}</b></span>}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <button 
        onClick={handleViewAll}
        style={{ 
          marginTop: '1.2rem', 
          width: '100%', 
          padding: '0.8rem', 
          background: 'transparent', 
          border: '1px solid var(--border-glass)',
          borderRadius: '12px',
          color: 'var(--text-secondary)',
          fontSize: '0.8rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }} className="hover-lift">
        전체 일정 보기 <ChevronRight size={14} />
      </button>
    </motion.div>
  );
}
