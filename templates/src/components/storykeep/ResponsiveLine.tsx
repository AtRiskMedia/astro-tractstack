import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { colors } from '../../constants';
import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { epinetCustomFilters } from '../../stores/analytics';

interface Point {
  y: number;
}

interface Series {
  id: string;
  data: Point[];
}

interface DataProps {
  data: Series[];
}

const MOBILE_BREAKPOINT = 768;

const ResponsiveLine = ({ data }: DataProps) => {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 0
  );
  const $epinetCustomFilters = useStore(epinetCustomFilters);
  const isMobile = windowWidth < MOBILE_BREAKPOINT;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate time context from epinetCustomFilters using UTC timestamps
  const timeContext = useMemo(() => {
    const { startTimeUTC, endTimeUTC } = $epinetCustomFilters;

    if (!startTimeUTC || !endTimeUTC) {
      // Default fallback
      return {
        totalHours: 168,
        xTickValues: [0, 1, 2, 3, 4, 5, 6, 7],
        xAxisLegend: 'Days ago',
        formatXAxisTick: (value: number) => `${value}d`,
      };
    }

    const startTime = new Date(startTimeUTC);
    const endTime = new Date(endTimeUTC);
    const totalMs = endTime.getTime() - startTime.getTime();
    const totalHours = totalMs / (1000 * 60 * 60);

    if (totalHours <= 2) {
      // Very short range - show minutes
      const totalMinutes = totalMs / (1000 * 60);
      const minuteTicks = [];
      const stepSize = Math.max(1, Math.floor(totalMinutes / 8));
      for (let i = 0; i <= totalMinutes; i += stepSize) {
        minuteTicks.push(i);
      }
      return {
        totalHours,
        xTickValues: minuteTicks,
        xAxisLegend: 'Minutes ago',
        formatXAxisTick: (value: number) => `${Math.round(totalMinutes - value)}m`,
      };
    } else if (totalHours <= 48) {
      // Show as hours
      const hourTicks = [];
      const stepSize = Math.max(1, Math.floor(totalHours / 8));
      for (let i = 0; i <= totalHours; i += stepSize) {
        hourTicks.push(i);
      }
      return {
        totalHours,
        xTickValues: hourTicks,
        xAxisLegend: 'Hours ago',
        formatXAxisTick: (value: number) => `${Math.round(totalHours - value)}h`,
      };
    } else if (totalHours <= 336) { // <= 14 days
      // Show as days
      const totalDays = totalHours / 24;
      const dayTicks = [];
      const stepSize = Math.max(1, Math.floor(totalDays / 7));
      for (let i = 0; i <= totalDays; i += stepSize) {
        dayTicks.push(i);
      }
      return {
        totalHours,
        xTickValues: dayTicks,
        xAxisLegend: 'Days ago',
        formatXAxisTick: (value: number) => `${Math.round(totalDays - value)}d`,
      };
    } else {
      // Show as weeks for longer ranges
      const totalWeeks = totalHours / 168;
      const weekTicks = [];
      const stepSize = Math.max(1, Math.floor(totalWeeks / 6));
      for (let i = 0; i <= totalWeeks; i += stepSize) {
        weekTicks.push(i);
      }
      return {
        totalHours,
        xTickValues: weekTicks,
        xAxisLegend: 'Weeks ago',
        formatXAxisTick: (value: number) => `${Math.round(totalWeeks - value)}w`,
      };
    }
  }, [$epinetCustomFilters.startTimeUTC, $epinetCustomFilters.endTimeUTC]);

  interface RechartsDataPoint {
    name: number;
    [key: string]: number | undefined;
  }

  const rechartsData: RechartsDataPoint[] = data
    .map((series) => {
      return series.data.map((point, index) => ({
        name: index,
        [series.id]: point.y,
      }));
    })
    .reduce((acc, curr) => {
      curr.forEach((obj, index) => {
        if (!acc[index]) {
          acc[index] = { name: index };
        }
        acc[index] = { ...acc[index], ...obj };
      });
      return acc;
    }, [] as RechartsDataPoint[]);

  const maxY = Math.max(
    ...data.flatMap((series) => series.data.map((point) => point.y))
  );

  const getLineStyle = (index: number) => {
    const patterns = [
      { strokeDasharray: '0', pattern: 'Solid' },
      { strokeDasharray: '8 4', pattern: 'Long dash' },
      { strokeDasharray: '2 2', pattern: 'Dot' },
      { strokeDasharray: '6 2 2 2', pattern: 'Dash-dot' },
      { strokeDasharray: '12 4', pattern: 'Extra long dash' },
      { strokeDasharray: '4 4', pattern: 'Medium dash' },
      { strokeDasharray: '8 2 2 2 2 2', pattern: 'Dash-dot-dot' },
      { strokeDasharray: '16 2', pattern: 'Very long dash' },
      { strokeDasharray: '2 6', pattern: 'Sparse dot' },
      { strokeDasharray: '12 2 2 2', pattern: 'Long dash-dot' },
      { strokeDasharray: '4 2 4', pattern: 'Dash gap dash' },
      { strokeDasharray: '8 2 2 2 2', pattern: 'Dash double-dot' },
    ];

    return {
      stroke: colors[index % colors.length],
      strokeDasharray: patterns[index % patterns.length].strokeDasharray,
      pattern: patterns[index % patterns.length].pattern,
    };
  };

  return (
    <div className="flex h-full w-full flex-col">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={rechartsData}
          margin={
            isMobile
              ? { top: 5, right: 5, left: 0, bottom: 5 }
              : { top: 20, right: 20, left: 20, bottom: 20 }
          }
          style={{
            borderRadius: '0.375rem',
            backgroundColor: '#282C34',
            color: '#ABB2BF',
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#3E4451" />
          <XAxis
            dataKey="name"
            type="number"
            domain={[0, Math.max(...timeContext.xTickValues, 1)]}
            ticks={timeContext.xTickValues}
            tickFormatter={timeContext.formatXAxisTick}
            label={
              !isMobile
                ? {
                  value: timeContext.xAxisLegend,
                  position: 'bottom',
                  offset: 20,
                  style: { fill: '#ABB2BF' },
                }
                : undefined
            }
            padding={{ left: 10, right: 10 }}
            stroke="#ABB2BF"
            tick={{ fontSize: isMobile ? 12 : 14 }}
          />
          <YAxis
            domain={[0, maxY]}
            tickCount={5}
            label={
              !isMobile
                ? {
                  value: 'Events',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  dy: 10,
                  style: { fill: '#ABB2BF' },
                }
                : undefined
            }
            padding={{ top: 10, bottom: 10 }}
            stroke="#ABB2BF"
            tick={{ fontSize: isMobile ? 12 : 14 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#21252B',
              border: '1px solid #3E4451',
              color: '#ABB2BF',
              fontSize: isMobile ? 12 : 14,
            }}
          />
          <Legend
            verticalAlign={isMobile ? 'bottom' : 'top'}
            height={isMobile ? 100 : 80}
            wrapperStyle={{
              color: '#ABB2BF',
              fontSize: isMobile ? 11 : 16,
              paddingTop: isMobile ? '0.5rem' : 0,
              paddingBottom: isMobile ? '0.5rem' : 0,
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          />
          {data.map((series, index) => {
            const lineStyle = getLineStyle(index);
            return (
              <Line
                key={series.id}
                type="monotone"
                dataKey={series.id}
                name={`${series.id} (${lineStyle.pattern})`}
                stroke={lineStyle.stroke}
                strokeDasharray={lineStyle.strokeDasharray}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 8,
                  strokeWidth: 2,
                  fill: lineStyle.stroke,
                  stroke: '#282C34',
                }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ResponsiveLine;
