'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';

interface RadarPoint {
  label: string;
  value: number; // 0-100
  color: string;
}

interface GlobalRiskRadarProps {
  data: RadarPoint[];
  size?: number;
}

const GlobalRiskRadar = memo(({ data, size = 200 }: GlobalRiskRadarProps) => {
  const center = size / 2;
  const radius = (size / 2) * 0.8;
  const angleStep = (Math.PI * 2) / data.length;

  // 축(Axis) 좌표 계산
  const axisPoints = useMemo(() => {
    return data.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
        labelAngle: angle
      };
    });
  }, [data, center, radius, angleStep]);

  // 데이터 폴리곤 경로 계산
  const polygonPath = useMemo(() => {
    const points = data.map((d, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const r = (d.value / 100) * radius;
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    });
    return `M ${points.join(' L ')} Z`;
  }, [data, center, radius, angleStep]);

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        {/* Background Concentric Circles */}
        {[0.2, 0.4, 0.6, 0.8, 1.0].map((step, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={radius * step}
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="1"
          />
        ))}

        {/* Axis Lines */}
        {axisPoints.map((p, i) => (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
        ))}

        {/* Data Polygon */}
        <motion.path
          initial={{ d: `M ${center},${center} `.repeat(data.length) + ' Z', opacity: 0 }}
          animate={{ d: polygonPath, opacity: 1 }}
          transition={{ duration: 1.2, ease: "circOut" }}
          fill="rgba(139, 92, 246, 0.2)"
          stroke="#8b5cf6"
          strokeWidth="2"
          style={{ filter: 'drop-shadow(0 0 10px rgba(139, 92, 246, 0.4))' }}
        />

        {/* Data Points (Glow) */}
        {data.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const r = (d.value / 100) * radius;
          const px = center + r * Math.cos(angle);
          const py = center + r * Math.sin(angle);
          return (
            <motion.circle
              key={i}
              cx={px}
              cy={py}
              r="3"
              fill="#8b5cf6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            />
          );
        })}

        {/* Labels */}
        {data.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const labelDist = radius + 20;
          const lx = center + labelDist * Math.cos(angle);
          const ly = center + labelDist * Math.sin(angle);
          
          return (
            <text
              key={i}
              x={lx}
              y={ly}
              fill="var(--text-secondary)"
              fontSize="10"
              fontWeight="900"
              textAnchor="middle"
              alignmentBaseline="middle"
              style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
});

GlobalRiskRadar.displayName = 'GlobalRiskRadar';

export default GlobalRiskRadar;
