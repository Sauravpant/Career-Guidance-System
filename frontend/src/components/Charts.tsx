import React from 'react';

// ─── 1. LINE CHART: SKILL GAP HISTORY ───────────────────────────────
interface LineChartProps {
  data: Array<{ careerName: string; score: number; createdAt: string }>;
}

export const SkillGapLineChart: React.FC<LineChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No historical analysis runs yet.
      </div>
    );
  }

  const width = 500;
  const height = 180;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Max score is 100, min is 0
  const points = data.map((item, idx) => {
    const x = paddingLeft + (idx / Math.max(1, data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (item.score / 100) * chartHeight;
    return { x, y, score: item.score, date: new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) };
  });

  const pathD = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') 
    : '';

  // Area under line
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
    : '';

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(val => {
          const y = paddingTop + chartHeight - (val / 100) * chartHeight;
          return (
            <g key={val}>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" />
              <text x={paddingLeft - 10} y={y + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">{val}%</text>
            </g>
          );
        })}

        {/* X Axis Labels */}
        {points.map((p, idx) => (
          <text key={idx} x={p.x} y={height - 10} fill="var(--text-muted)" fontSize="10" textAnchor="middle">
            {p.date}
          </text>
        ))}

        {/* Gradient Area */}
        {areaD && <path d={areaD} fill="url(#lineGrad)" />}

        {/* Smooth Connection Line */}
        {pathD && <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'd 0.5s ease-in-out' }} />}

        {/* Nodes */}
        {points.map((p, idx) => (
          <g key={idx} className="chart-node" style={{ cursor: 'pointer' }}>
            <circle cx={p.x} cy={p.y} r="5" fill="var(--bg-secondary)" stroke="var(--primary)" strokeWidth="3" />
            <title>{`${data[idx].careerName}: ${p.score}%`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
};


// ─── 2. BAR CHART: WEEKLY GOAL HISTORY ──────────────────────────────
interface BarChartProps {
  data: Array<{ weekOf: string; total: number; completed: number; completionPercent: number }>;
}

export const WeeklyGoalBarChart: React.FC<BarChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No goals history.
      </div>
    );
  }

  const width = 500;
  const height = 180;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const barWidth = 32;
  const gap = (chartWidth - barWidth * data.length) / Math.max(1, data.length - 1);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" style={{ overflow: 'visible' }}>
        {/* Horizontal grid lines */}
        {[0, 25, 50, 75, 100].map(val => {
          const y = paddingTop + chartHeight - (val / 100) * chartHeight;
          return (
            <g key={val}>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="var(--border-color)" strokeWidth="1" />
              <text x={paddingLeft - 10} y={y + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">{val}%</text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((item, idx) => {
          const x = paddingLeft + idx * (barWidth + gap);
          const barHeight = (item.completionPercent / 100) * chartHeight;
          const y = paddingTop + chartHeight - barHeight;
          const dateObj = new Date(item.weekOf);
          const label = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

          return (
            <g key={idx} style={{ cursor: 'pointer' }}>
              {/* Target Outline (Background Bar) */}
              <rect x={x} y={paddingTop} width={barWidth} height={chartHeight} rx="4" fill="rgba(255,255,255,0.02)" stroke="var(--border-color)" strokeWidth="1" />
              
              {/* Progress Foreground Bar */}
              <rect x={x} y={y} width={barWidth} height={Math.max(4, barHeight)} rx="4" fill="var(--purple)" style={{ transition: 'all 0.5s ease-out' }}>
                <title>{`Week of ${label}: ${item.completed}/${item.total} (${item.completionPercent}%)`}</title>
              </rect>

              {/* Weekly Label */}
              <text x={x + barWidth / 2} y={height - 10} fill="var(--text-muted)" fontSize="9" textAnchor="middle">
                {label}
              </text>

              {/* Floating Counter above bar */}
              {item.total > 0 && (
                <text x={x + barWidth / 2} y={y - 6} fill="var(--text-primary)" fontSize="9" fontWeight="600" textAnchor="middle">
                  {`${item.completed}/${item.total}`}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};


// ─── 3. SKILLS INVENTORY PROGRESS RINGS ──────────────────────────────
interface SkillDistributionProps {
  distribution: {
    completed: number;
    learning: number;
    wantToLearn: number;
  };
}

export const SkillDistributionChart: React.FC<SkillDistributionProps> = ({ distribution }) => {
  const { completed, learning, wantToLearn } = distribution;
  const total = completed + learning + wantToLearn;

  if (total === 0) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No skill records available. Add some in your profile!
      </div>
    );
  }

  // Draw 3 progress rings for Completed, Learning, and Want to Learn
  const renderRing = (label: string, count: number, color: string, radius: number) => {
    const size = 120;
    const strokeWidth = 10;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;
    const percent = total > 0 ? (count / total) * 100 : 0;
    const offset = circumference - (percent / 100) * circumference;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }} key={label}>
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size}>
            {/* Background Ring */}
            <circle cx={center} cy={center} r={radius} fill="transparent" stroke="var(--border-color)" strokeWidth={strokeWidth} />
            {/* Foreground Ring */}
            <circle cx={center} cy={center} r={radius} fill="transparent" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(-90 ${center} ${center})`} style={{ transition: 'stroke-dashoffset 0.8s ease-out' }} />
          </svg>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', fontFamily: 'var(--font-display)', color: '#fff' }}>
              {Math.round(percent)}%
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {count} {count === 1 ? 'skill' : 'skills'}
            </span>
          </div>
        </div>
        <span style={{ fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: color }}>
          {label}
        </span>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '100%', gap: '16px', flexWrap: 'wrap', padding: '10px 0' }}>
      {renderRing('Completed', completed, 'var(--success)', 45)}
      {renderRing('Learning', learning, 'var(--primary)', 45)}
      {renderRing('To Learn', wantToLearn, 'var(--warning)', 45)}
    </div>
  );
};
